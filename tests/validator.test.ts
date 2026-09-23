import { describe, it, expect } from "vitest";
import { validateUpload, FRIENDLY_EXTENSIONS } from "@/services/documents/validator";

describe("validateUpload", () => {
  it("accepts a valid PDF with correct magic bytes", () => {
    // %PDF-1.4...
    const buffer = Buffer.concat([
      Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]),
      Buffer.from("...rest of pdf..."),
    ]);
    const result = validateUpload({
      name: "contract.pdf",
      mimeType: "application/pdf",
      size: buffer.length,
      buffer,
    });
    expect(result.name).toBe("contract.pdf");
  });

  it("accepts plain text files without magic-byte check", () => {
    const buffer = Buffer.from("This is a contract. Some legal text.");
    const result = validateUpload({
      name: "contract.txt",
      mimeType: "text/plain",
      size: buffer.length,
      buffer,
    });
    expect(result.mimeType).toBe("text/plain");
  });

  it("accepts DOCX with zip magic bytes", () => {
    const buffer = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from("...rest of docx..."),
    ]);
    const result = validateUpload({
      name: "contract.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: buffer.length,
      buffer,
    });
    expect(result.mimeType).toContain("wordprocessingml");
  });

  it("rejects unsupported MIME type", () => {
    const buffer = Buffer.from("data");
    expect(() =>
      validateUpload({
        name: "file.exe",
        mimeType: "application/octet-stream",
        size: buffer.length,
        buffer,
      }),
    ).toThrow();
  });

  it("rejects empty files", () => {
    expect(() =>
      validateUpload({
        name: "empty.txt",
        mimeType: "text/plain",
        size: 0,
        buffer: Buffer.alloc(0),
      }),
    ).toThrow();
  });

  it("rejects files exceeding size limit", () => {
    // Set a tiny limit via env — we use the default 10MB here, so craft a buffer
    // that's > 10MB. Use a fake large size.
    const buffer = Buffer.from("data");
    expect(() =>
      validateUpload({
        name: "big.pdf",
        mimeType: "application/pdf",
        size: 20 * 1024 * 1024,
        buffer,
      }),
    ).toThrow();
  });

  it("rejects PDF with wrong magic bytes (Content-Type spoofing)", () => {
    const buffer = Buffer.from("not really a pdf");
    expect(() =>
      validateUpload({
        name: "fake.pdf",
        mimeType: "application/pdf",
        size: buffer.length,
        buffer,
      }),
    ).toThrow(/corrupt|invalid|unreadable/i);
  });

  it("rejects filenames containing null bytes", () => {
    const buffer = Buffer.from("text content");
    expect(() =>
      validateUpload({
        name: "file\x00malicious.txt",
        mimeType: "text/plain",
        size: buffer.length,
        buffer,
      }),
    ).toThrow();
  });

  it("rejects overly long filenames", () => {
    const buffer = Buffer.from("text content");
    expect(() =>
      validateUpload({
        name: "a".repeat(300),
        mimeType: "text/plain",
        size: buffer.length,
        buffer,
      }),
    ).toThrow();
  });

  it("accepts PDF when MIME is empty but extension is .pdf", () => {
    // Browser sometimes sends empty Content-Type. Validator should infer from extension.
    const buffer = Buffer.concat([
      Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]),
      Buffer.from("...rest of pdf..."),
    ]);
    const result = validateUpload({
      name: "contract.pdf",
      mimeType: "",
      size: buffer.length,
      buffer,
    });
    expect(result.mimeType).toBe("application/pdf");
  });

  it("accepts PDF when MIME is application/octet-stream but extension is .pdf", () => {
    // Some browsers send generic octet-stream for PDFs.
    const buffer = Buffer.concat([
      Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]),
      Buffer.from("...rest of pdf..."),
    ]);
    const result = validateUpload({
      name: "contract.pdf",
      mimeType: "application/octet-stream",
      size: buffer.length,
      buffer,
    });
    expect(result.mimeType).toBe("application/pdf");
  });

  it("accepts TXT when MIME is empty but extension is .txt", () => {
    const buffer = Buffer.from("This is a contract.");
    const result = validateUpload({
      name: "contract.txt",
      mimeType: "",
      size: buffer.length,
      buffer,
    });
    expect(result.mimeType).toBe("text/plain");
  });

  it("rejects files with no extension and no recognizable MIME", () => {
    const buffer = Buffer.from("some random data here");
    expect(() =>
      validateUpload({
        name: "noextension",
        mimeType: "",
        size: buffer.length,
        buffer,
      }),
    ).toThrow();
  });
});

describe("FRIENDLY_EXTENSIONS", () => {
  it("lists extensions for each supported type", () => {
    expect(FRIENDLY_EXTENSIONS["application/pdf"]).toEqual([".pdf"]);
    expect(FRIENDLY_EXTENSIONS["text/plain"]).toEqual([".txt"]);
  });
});

// (no helper class needed — AppError imported above)

