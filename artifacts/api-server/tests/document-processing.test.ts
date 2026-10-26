import assert from "node:assert/strict";
import test from "node:test";
import { extractDocumentText } from "../src/lib/document-processing";

function createTextPdf(text: string): Buffer {
  const stream = `BT /F1 12 Tf 20 100 Td (${text}) Tj ET`;
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += object;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "ascii");
}

test("extracts UTF-8 TXT and removes a BOM", async () => {
  const buffer = Buffer.from("\uFEFFA safe test document.", "utf8");
  const extracted = await extractDocumentText({
    buffer,
    originalname: "note.txt",
  });
  assert.equal(extracted.format, "txt");
  assert.equal(extracted.text, "A safe test document.");
});

test("extracts embedded text from a PDF", async () => {
  const extracted = await extractDocumentText({
    buffer: createTextPdf("Email: test@example.test"),
    originalname: "sample.pdf",
  });
  assert.equal(extracted.format, "pdf");
  assert.match(extracted.text, /test@example\.test/);
});

test("rejects binary data disguised as TXT", async () => {
  await assert.rejects(
    extractDocumentText({
      buffer: Buffer.from([0x41, 0x00, 0x42]),
      originalname: "note.txt",
    }),
    /binary data/i,
  );
});

test("rejects damaged PDF input", async () => {
  await assert.rejects(
    extractDocumentText({
      buffer: Buffer.from("%PDF-not a valid document"),
      originalname: "document.pdf",
    }),
    /could not be read/i,
  );
});
