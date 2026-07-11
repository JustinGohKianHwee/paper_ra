/**
 * Hardened outbound fetch for user-supplied URLs (paper pages, PDFs) and
 * metadata APIs. Guards against SSRF and resource abuse:
 *  - https only; no credentials in URL; default ports only
 *  - hostname must not be private/loopback/link-local/metadata (literal IPs
 *    and DNS resolution are both checked)
 *  - redirects followed manually with the same checks per hop (max 3)
 *  - response capped by content-type allowlist, byte size, and wall-clock time
 *
 * `isForbiddenHost`/`isPrivateAddress` are pure and unit-tested.
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 30_000;
export const MAX_RESPONSE_BYTES = 30 * 1024 * 1024; // 30 MB — generous for PDFs

export function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      (a === 169 && b === 254) || // link-local / cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224 // multicast + reserved
    );
  }
  if (version === 6) {
    const lower = ip.toLowerCase();
    return (
      lower === "::" ||
      lower === "::1" ||
      lower.startsWith("fe80:") || // link-local
      lower.startsWith("fc") || // unique local fc00::/7
      lower.startsWith("fd") ||
      lower.startsWith("::ffff:") // v4-mapped — re-check the embedded v4
    );
  }
  return true; // not an IP — caller resolves via DNS
}

export function isForbiddenHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".lan")) return true;
  if (host === "metadata.google.internal") return true;
  if (isIP(host)) return isPrivateAddress(host);
  return false;
}

async function assertSafeUrl(url: URL): Promise<void> {
  if (url.protocol !== "https:") {
    throw new Error(`Only https URLs are allowed (got ${url.protocol}//)`);
  }
  if (url.username || url.password) {
    throw new Error("URLs with embedded credentials are not allowed");
  }
  if (url.port && url.port !== "443") {
    throw new Error("Only the default https port is allowed");
  }
  if (isForbiddenHost(url.hostname)) {
    throw new Error("This host is not allowed");
  }
  if (!isIP(url.hostname)) {
    // Resolve and verify every address to block DNS-based SSRF.
    const records = await lookup(url.hostname, { all: true }).catch(() => []);
    if (records.length === 0) throw new Error(`Cannot resolve host ${url.hostname}`);
    for (const record of records) {
      if (isPrivateAddress(record.address)) {
        throw new Error("This host resolves to a private address and is not allowed");
      }
    }
  }
}

export interface SafeFetchOptions {
  accept?: string;
  /** Allowed response content-type prefixes; unset = any. */
  allowedContentTypes?: string[];
  maxBytes?: number;
}

export async function safeFetch(rawUrl: string, options: SafeFetchOptions = {}): Promise<Response> {
  const maxBytes = options.maxBytes ?? MAX_RESPONSE_BYTES;
  let url = new URL(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertSafeUrl(url);

    const response = await fetch(url, {
      redirect: "manual",
      headers: {
        accept: options.accept ?? "*/*",
        "user-agent": "ResearchAtlas/1.0 (personal research notebook)",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error(`Redirect without location from ${url.hostname}`);
      url = new URL(location, url);
      continue;
    }

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText} (${url.hostname})`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (
      options.allowedContentTypes &&
      !options.allowedContentTypes.some((t) => contentType.startsWith(t))
    ) {
      throw new Error(`Unexpected content type "${contentType}" from ${url.hostname}`);
    }

    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > maxBytes) {
      throw new Error(`Response too large (${Math.round(declared / 1024 / 1024)} MB)`);
    }

    // Enforce the size cap on the actual stream, not just the header.
    const buffer = await readCapped(response, maxBytes);
    return new Response(buffer as unknown as BodyInit, {
      status: response.status,
      headers: response.headers,
    });
  }
  throw new Error("Too many redirects");
}

async function readCapped(response: Response, maxBytes: number): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("Response exceeded the size limit");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}
