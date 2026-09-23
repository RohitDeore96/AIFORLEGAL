/**
 * File validator — never trust uploaded files.
 * Validates: MIME, magic-bytes (when possible), size, emptiness.
 */
import { env } from "@/lib/env";
import { Errors } from "@/lib/errors";

export type ValidatedFile = {
  name: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
};

const ALLOWED = new Set(env.ALLOWED_MIME_TYPES.split(",").map((s) => s.trim()));

// Magic-byte signatures (defence-in-depth against spoofed Content-Type).
const SIGNATURES: { mime: string; bytes: number[] }[] = [
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    bytes: [0x50, 0x4b, 0x03, 0x04], // PK\x03\x04 (zip)
  },
];

function matchesSignature(buffer: Buffer, expected: number[]): boolean {
  if (buffer.length < expected.length) return false;
  return expected.every((b, i) => buffer[i] === b);
}

export function validateUpload(file: {
  name: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}): ValidatedFile {
  const { name, mimeType, size, buffer } = file;

  // 1. MIME whitelist
  if (!ALLOWED.has(mimeType)) {
    throw Errors.unsupportedFile(mimeType);
  }

  // 2. Size limit
  if (size > env.MAX_UPLOAD_BYTES) {
    throw Errors.fileTooLarge(size, env.MAX_UPLOAD_BYTES);
  }

  // 3. Empty check
  if (size === 0 || buffer.length === 0) {
    throw Errors.emptyFile();
  }

  // 4. Magic-byte check for binary types (defence-in-depth)
  const sig = SIGNATURES.find((s) => s.mime === mimeType);
  if (sig && !matchesSignature(buffer, sig.bytes)) {
    // Text/plain intentionally skipped (no signature).
    throw Errors.corruptFile();
  }

  // 5. Filename sanity
  if (name.length === 0 || name.length > 255 || name.includes("\0")) {
    throw Errors.validation("Invalid filename");
  }

  return { name, mimeType, size, buffer };
}

/** MIME -> friendly extension list. Used for client-side hints. */
export const FRIENDLY_EXTENSIONS: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};
