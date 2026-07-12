/**
 * Deterministic mock of the OpenAI chat-completions endpoint for tests.
 * Dispatches on the response_format json_schema name the app sends.
 *
 * Run standalone:  node tests/mocks/openai-server.mjs [port]
 * Import in tests: `startMockOpenAI(port)` → { url, close }.
 */
import http from "node:http";

const AI_NOTE_SECTIONS = [
  "summary",
  "thesis",
  "problem",
  "insufficiency",
  "architecture",
  "mechanism",
  "intuition",
  "why_it_works",
  "training_setup",
  "evaluation",
  "results",
  "failure_modes",
  "boss_explanation",
];

function payloadFor(schemaName, body) {
  switch (schemaName) {
    case "passages": {
      // Echo the chunk's page range so page anchors stay plausible.
      const userMessage = body.messages?.find((m) => m.role === "user")?.content ?? "";
      const range = userMessage.match(/pages (\d+)–(\d+)/);
      const start = range ? Number(range[1]) : 1;
      const end = range ? Number(range[2]) : 2;
      return {
        passages: [
          {
            title: "Mock Introduction",
            anchor: "§1 Introduction",
            page_start: start,
            page_end: start,
            summary_md:
              "**Mock passage summary**: what the introduction sets up and why it matters. (mock-passage-marker)",
          },
          {
            title: "Mock Method",
            anchor: "§2 Method",
            page_start: end,
            page_end: end,
            summary_md: "Mock explanation of the method — watch for the ablation setup.",
          },
        ],
      };
    }
    case "notes":
      return Object.fromEntries(
        AI_NOTE_SECTIONS.map((s) =>
          s === "summary"
            ? [s, "Mock AI summary of the paper. (mock-notes-marker)"]
            : [s, `Mock ${s.replace(/_/g, " ")} drafted from the available text.`]
        )
      );
    case "suggestions":
      return {
        topics: [
          { name: "Sequential Recommendation", rationale: "Mock: matches an existing topic." },
          { name: "Mock Emerging Topic", rationale: "Mock: nothing existing fits." },
        ],
        concepts: [{ name: "Mock Concept", rationale: "Mock rationale for the concept." }],
        priority: { value: 4, rationale: "Mock: central to the library's focus." },
        relevance: { value: 3, rationale: "Mock: adjacent to current projects." },
      };
    case "synthesis_draft":
      return {
        draft_md:
          "# What did I learn this week?\nMock synthesis drafted from recorded activity. (mock-synthesis-marker)\n\n# What should I read next?\nMock suggestion based on the open questions.",
      };
    case "qa_answer":
      return {
        answer_md:
          "The paper states the mock mechanism is defined in the method section (p. 2). **Interpretation:** this mock answer exists to test grounding plumbing. (mock-qa-marker)",
        cited_pages: [1, 2],
        coverage: "grounded",
      };
    case "formula_ocr":
      return {
        latex: "\\hat{y} = \\mathrm{softmax}(W x + b)",
        display_md: "$$\\hat{y} = \\mathrm{softmax}(W x + b)$$",
        confidence: "high",
        warnings: [],
      };
    case "radar_explanations": {
      // Explain every candidate the prompt listed, echoing indices.
      const userMessage = body.messages?.find((m) => m.role === "user")?.content ?? "";
      const indices = [...userMessage.matchAll(/^\[(\d+)\] /gm)].map((m) => Number(m[1]));
      return {
        items: (indices.length > 0 ? indices : [0]).map((index) => ({
          index,
          relevance: 4,
          why: `Mock explanation: connects to your recorded topics. (mock-radar-marker-${index})`,
        })),
      };
    }
    default:
      return { error: `Unknown schema ${schemaName}` };
  }
}

/**
 * Deterministic arXiv Atom feed for Radar tests. Titles vary with the query
 * so dedupe/diversity logic sees distinct candidates; two entries share a
 * near-identical title to exercise the diversity filter.
 */
function arxivFeedFor(searchQuery) {
  const topic = decodeURIComponent(searchQuery ?? "mock topic")
    .replace(/all:|"/g, "")
    .trim();
  const slugPart = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 24);
  const entry = (n, title) => `
  <entry>
    <id>http://arxiv.org/abs/9901.0000${n}v1</id>
    <title>${title}</title>
    <summary>Mock abstract about ${topic}: transformer-style sequence modelling for recommendation with production evidence. (mock-arxiv-${slugPart})</summary>
    <published>2026-07-01T00:00:00Z</published>
    <author><name>Mock Author</name></author>
    <author><name>Second Author</name></author>
  </entry>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  ${entry(1, `Mock Advances in ${topic} at Scale`)}
  ${entry(2, `A Mock Survey of ${topic} Methods`)}
  ${entry(3, `Mock Advances in ${topic} at Scale v2 Duplicate`)}
</feed>`;
}

export function createMockServer() {
  return http.createServer((req, res) => {
    if (req.method === "GET" && req.url?.endsWith("/health")) {
      res.writeHead(200, { "content-type": "application/json" }).end('{"ok":true}');
      return;
    }
    if (req.method === "GET" && req.url?.includes("/api/query")) {
      const url = new URL(req.url, "http://localhost");
      res.writeHead(200, { "content-type": "application/atom+xml" });
      res.end(arxivFeedFor(url.searchParams.get("search_query") ?? ""));
      return;
    }
    if (!req.url?.endsWith("/chat/completions") || req.method !== "POST") {
      res.writeHead(404).end(JSON.stringify({ error: "not found" }));
      return;
    }
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      let body = {};
      try {
        body = JSON.parse(raw);
      } catch {
        res.writeHead(400).end(JSON.stringify({ error: "bad json" }));
        return;
      }
      const schemaName = body.response_format?.json_schema?.name ?? "unknown";
      const payload = payloadFor(schemaName, body);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "chatcmpl-mock",
          object: "chat.completion",
          model: body.model ?? "mock-model",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: JSON.stringify(payload) },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        })
      );
    });
  });
}

export function startMockOpenAI(port = 0) {
  const server = createMockServer();
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        url: `http://127.0.0.1:${address.port}/v1`,
        port: address.port,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

// Standalone mode (Playwright webServer)
if (process.argv[1] && process.argv[1].endsWith("openai-server.mjs")) {
  const port = Number(process.argv[2] ?? process.env.MOCK_OPENAI_PORT ?? 3106);
  createMockServer().listen(port, "127.0.0.1", () => {
    console.log(`Mock OpenAI listening on http://127.0.0.1:${port}/v1`);
  });
}
