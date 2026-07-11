/**
 * Generates tests/fixtures/sample-paper.pdf — a minimal 2-page PDF used by
 * E2E/integration tests so no network fetch is needed. Run once:
 *   node tests/fixtures/make-fixture-pdf.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function textStream(lines) {
  const body = lines
    .map((line, i) => `BT /F1 12 Tf 50 ${740 - i * 18} Td (${line}) Tj ET`)
    .join("\n");
  return body;
}

const page1 = textStream([
  "Mock Paper: Understanding Fixture Attention",
  "Abstract: This tiny paper exists so tests can run offline.",
  "1 Introduction",
  "We introduce fixture attention, a mechanism for deterministic tests.",
  "It has no other purpose whatsoever.",
]);
const page2 = textStream([
  "2 Method",
  "The method applies a constant transformation to every token.",
  "3 Conclusion",
  "Fixture attention behaves identically on every run.",
]);

const objects = [];
objects[1] = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
objects[2] = `2 0 obj\n<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>\nendobj\n`;
objects[3] = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 7 0 R >> >> >>\nendobj\n`;
objects[4] = `4 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 6 0 R /Resources << /Font << /F1 7 0 R >> >> >>\nendobj\n`;
objects[5] = `5 0 obj\n<< /Length ${page1.length} >>\nstream\n${page1}\nendstream\nendobj\n`;
objects[6] = `6 0 obj\n<< /Length ${page2.length} >>\nstream\n${page2}\nendstream\nendobj\n`;
objects[7] = `7 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;

let pdf = "%PDF-1.4\n";
const offsets = [0];
for (let i = 1; i <= 7; i++) {
  offsets[i] = pdf.length;
  pdf += objects[i];
}
const xrefStart = pdf.length;
pdf += "xref\n0 8\n0000000000 65535 f \n";
for (let i = 1; i <= 7; i++) {
  pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
}
pdf += `trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

writeFileSync(join(here, "sample-paper.pdf"), pdf, "latin1");
console.log("Wrote sample-paper.pdf", pdf.length, "bytes");
