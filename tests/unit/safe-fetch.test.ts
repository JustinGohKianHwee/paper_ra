import { describe, expect, it } from "vitest";
import { isForbiddenHost, isPrivateAddress } from "@/lib/ai/safe-fetch";

describe("isPrivateAddress", () => {
  it("blocks loopback, RFC1918, link-local, CGNAT, and reserved v4 ranges", () => {
    for (const ip of [
      "127.0.0.1",
      "10.0.0.5",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.169.254", // cloud metadata
      "100.64.0.1",
      "0.0.0.0",
      "224.0.0.1",
    ]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });

  it("allows public v4 addresses", () => {
    for (const ip of ["8.8.8.8", "104.16.0.1", "172.15.0.1", "172.32.0.1", "100.63.0.1"]) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });

  it("blocks loopback, link-local, unique-local, and v4-mapped v6", () => {
    for (const ip of ["::1", "::", "fe80::1", "fc00::1", "fd12:3456::1", "::ffff:10.0.0.1"]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
    expect(isPrivateAddress("2606:4700::1111")).toBe(false);
  });
});

describe("isForbiddenHost", () => {
  it("blocks localhost and internal-style hostnames", () => {
    for (const host of [
      "localhost",
      "api.localhost",
      "printer.local",
      "service.internal",
      "nas.lan",
      "metadata.google.internal",
      "LOCALHOST",
      "localhost.", // trailing-dot form
      "",
    ]) {
      expect(isForbiddenHost(host), host).toBe(true);
    }
  });

  it("blocks literal private IPs used as hostnames", () => {
    expect(isForbiddenHost("127.0.0.1")).toBe(true);
    expect(isForbiddenHost("169.254.169.254")).toBe(true);
  });

  it("allows normal public hostnames (DNS re-check happens separately)", () => {
    for (const host of ["arxiv.org", "export.arxiv.org", "api.crossref.org", "example.com"]) {
      expect(isForbiddenHost(host), host).toBe(false);
    }
  });
});
