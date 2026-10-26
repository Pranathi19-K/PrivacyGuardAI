import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_EXTRACTED_CHARS = 1_000_000;

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
}

export async function extractDocumentText(
  file: UploadedFile,
): Promise<{ text: string; format: "pdf" | "txt" }> {
  const extension = file.originalname.toLowerCase().split(".").pop();
  if (extension === "txt") {
    if (file.buffer.includes(0)) {
      throw new Error("This TXT file contains binary data and cannot be scanned.");
    }
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(file.buffer);
    } catch {
      throw new Error("This TXT file is not valid UTF-8 text.");
    }
    text = text.replace(/^\uFEFF/, "");
    if (!text.trim()) {
      throw new Error("This TXT file is empty.");
    }
    if (text.length > MAX_EXTRACTED_CHARS) {
      throw new Error("Extracted text is too large to scan safely.");
    }
    return { text, format: "txt" };
  }

  if (extension !== "pdf" || file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("Upload a valid PDF or UTF-8 TXT document.");
  }

  let loadingTask: ReturnType<typeof pdfjs.getDocument> | undefined;
  try {
    loadingTask = pdfjs.getDocument({
      data: new Uint8Array(file.buffer),
      useSystemFonts: true,
      disableFontFace: true,
      verbosity: 0,
    });
    const pdf = await loadingTask.promise;
    if (pdf.numPages > 100) {
      throw new Error("PDFs with more than 100 pages are not supported.");
    }
    const parts: string[] = [];
    let textLength = 0;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) =>
          "str" in item && typeof item.str === "string"
            ? `${item.str}${"hasEOL" in item && item.hasEOL ? "\n" : " "}`
            : "",
        )
        .join("");
      parts.push(pageText);
      textLength += pageText.length + 1;
      if (textLength > MAX_EXTRACTED_CHARS) {
        throw new Error("Extracted text is too large to scan safely.");
      }
    }
    const text = parts.join("\n").trim();
    if (!text) {
      throw new Error("No extractable text was found. Scanned image PDFs are not supported yet.");
    }
    return { text, format: "pdf" };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("100 pages") || error.message.includes("too large"))
    ) {
      throw error;
    }
    throw new Error("This PDF could not be read. Check that it is not password-protected or damaged.");
  } finally {
    try {
      await loadingTask?.destroy();
    } catch {
      // The document parse result or its original error is more useful than cleanup failures.
    }
  }
}

