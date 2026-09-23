/**
 * Document text extractor.
 *
 * Supports: PDF, DOCX, TXT.
 * Each extractor returns { text, pageCount } where applicable.
 * Failures throw AppError so callers can surface a clean message.
 */
import { Errors } from "@/lib/errors";

export type ExtractedDocument = {
  text: string;
  pageCount: number | null;
  language: string | null;
};

export async function extractText(
  buffer: Buffer,
  mimeType: string,
): Promise<ExtractedDocument> {
  switch (mimeType) {
    case "application/pdf":
      return extractPdf(buffer);
    case "text/plain":
      return extractTxt(buffer);
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return extractDocx(buffer);
    default:
      throw Errors.unsupportedFile(mimeType);
  }
}

async function extractTxt(buffer: Buffer): Promise<ExtractedDocument> {
  const text = buffer.toString("utf-8");
  if (text.trim().length === 0) throw Errors.emptyFile();
  return { text, pageCount: null, language: detectLanguage(text) };
}

async function extractPdf(buffer: Buffer): Promise<ExtractedDocument> {
  // Dynamic import keeps cold-start fast for non-PDF paths.
  // pdf-parse v2 uses a class-based API:
  //   const parser = new PDFParse({ data: buffer })
  //   const result = await parser.getText()
  //   result.text — full extracted text
  //   result.total — total page count
  const pdfParseModule = await import("pdf-parse");
  const PDFParse = (pdfParseModule as { PDFParse?: unknown }).PDFParse;
  if (!PDFParse || typeof PDFParse !== "function") {
    console.error("[parser] pdf-parse v2 API not found. Module exports:", Object.keys(pdfParseModule));
    throw Errors.internal();
  }
  try {
    const parser = new (PDFParse as new (config: { data: Buffer }) => {
      getText(): Promise<{ text: string; total: number; pages: { text: string; num: number }[] }>;
    })({ data: buffer });
    const result = await parser.getText();
    const text = result.text ?? "";
    if (text.trim().length === 0) {
      // Could be a scanned PDF (no text layer). Surface honest message.
      throw Errors.validation(
        "No selectable text was found in this PDF. It may be a scanned image; OCR is not supported.",
      );
    }
    return {
      text,
      pageCount: typeof result.total === "number" ? result.total : null,
      language: detectLanguage(text),
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AppError") throw err;
    console.error("[parser] PDF extraction failed:", err);
    throw Errors.corruptFile();
  }
}

async function extractDocx(buffer: Buffer): Promise<ExtractedDocument> {
  const mammoth = await import("mammoth");
  try {
    const result = await mammoth.extractRawText({ buffer });
    if (!result.value || result.value.trim().length === 0) {
      throw Errors.emptyFile();
    }
    return {
      text: result.value,
      pageCount: null, // DOCX has no inherent page concept
      language: detectLanguage(result.value),
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AppError") throw err;
    throw Errors.corruptFile();
  }
}

/**
 * Crude language sniff — enough to label English vs. non-English so we can
 * refuse jurisdiction-specific questions when language != expected.
 * Replace with `cld3` or a Cloud Translation API call for production.
 */
function detectLanguage(text: string): string | null {
  const sample = text.slice(0, 1000);
  if (!sample) return null;
  const ascii = (sample.match(/[\x20-\x7E]/g) ?? []).length;
  const ratio = ascii / sample.length;
  if (ratio > 0.9) return "en";
  // Heuristic: count CJK characters
  const cjk = (sample.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) ?? []).length;
  if (cjk > sample.length * 0.2) return "ja"; // approximate
  return "other";
}
