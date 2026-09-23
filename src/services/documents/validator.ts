/**
 * File validator — never trust uploaded files.
 * Validates: extension, MIME, magic-bytes (when possible), size, emptiness.
 *
 * Browsers are inconsistent about setting Content-Type on File objects.
 * We accept a file if EITHER:
 *   - Its extension is in the allowed extension list, OR
 *   - Its MIME type is in the allowed MIME list
 *
 * Then we verify the magic bytes match the claimed type (defence-in-depth
 * against spoofed Content-Type / extension).
 */
import { env } from "@/lib/env";
import { Errors } from "@/lib/errors";

export type ValidatedFile = {
  name: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
};

const ALLOWED_MIMES = new Set(
  env.ALLOWED_MIME_TYPES.split(",").map((s) => s.trim()).filter(Boolean),
);

// Extension → canonical MIME mapping (used for both validation and fallback).
const EXTENSION_TO_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const ALLOWED_EXTENSIONS = new Set(Object.keys(EXTENSION_TO_MIME));

// Magic-byte signatures (defence-in-depth against spoofed Content-Type).
const SIGNATURES: { mime: string; bytes: number[] }[] = [
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    bytes: [0x50, 0x4b, 0x03, 0x04], // PK\x03\x04 (zip — DOCX is a zip)
  },
];

function matchesSignature(buffer: Buffer, expected: number[]): boolean {
  if (buffer.length < expected.length) return false;
  return expected.every((b, i) => buffer[i] === b);
}

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx === -1) return "";
  return filename.slice(idx).toLowerCase();
}

export function validateUpload(file: {
  name: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}): ValidatedFile {
  const { name, mimeType, size, buffer } = file;

  // 1. Size limit (check first — cheapest)
  if (size > env.MAX_UPLOAD_BYTES) {
    throw Errors.fileTooLarge(size, env.MAX_UPLOAD_BYTES);
  }

  // 2. Empty check
  if (size === 0 || buffer.length === 0) {
    throw Errors.emptyFile();
  }

  // 3. Filename sanity
  if (name.length === 0 || name.length > 255 || name.includes("\0")) {
    throw Errors.validation("Invalid filename");
  }

  // 4. Determine the effective MIME type.
  //    Browsers often send empty/incorrect Content-Type. Fall back to the
  //    extension if the MIME is missing or unrecognized.
  const ext = getExtension(name);
  let effectiveMime = mimeType;

  // If MIME is empty or not in our allowlist, try to infer from extension.
  if (!effectiveMime || !ALLOWED_MIMES.has(effectiveMime)) {
    const inferred = EXTENSION_TO_MIME[ext];
    if (inferred) {
      effectiveMime = inferred;
    }
  }

  // 5. Whitelist check (MIME OR extension)
  const mimeAllowed = ALLOWED_MIMES.has(effectiveMime);
  const extAllowed = ALLOWED_EXTENSIONS.has(ext);
  if (!mimeAllowed && !extAllowed) {
    throw Errors.unsupportedFile(mimeType || ext || "unknown");
  }

  // 6. Magic-byte check for binary types (defence-in-depth against spoofing).
  //    If the file claims to be a PDF/DOCX but the magic bytes don't match,
  //    reject it.
  const sig = SIGNATURES.find((s) => s.mime === effectiveMime);
  if (sig && !matchesSignature(buffer, sig.bytes)) {
    throw Errors.corruptFile();
  }

  return { name, mimeType: effectiveMime, size, buffer };
}

/** MIME -> friendly extension list. Used for client-side hints. */
export const FRIENDLY_EXTENSIONS: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};
