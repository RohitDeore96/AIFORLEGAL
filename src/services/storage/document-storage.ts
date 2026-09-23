/**
 * Filesystem-backed document storage. Used for raw uploaded files.
 *
 * For Vercel production: swap this with Vercel Blob or Cloud Storage by
 * implementing the same interface. The rest of the app is storage-agnostic.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";
import { Errors } from "@/lib/errors";

export interface IDocumentStorage {
  save(key: string, buffer: Buffer): Promise<string>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

class FsStorage implements IDocumentStorage {
  constructor(private rootDir: string) {}

  async save(key: string, buffer: Buffer): Promise<string> {
    await fs.mkdir(this.rootDir, { recursive: true });
    const fullPath = path.join(this.rootDir, key);
    await fs.writeFile(fullPath, buffer);
    return fullPath;
  }

  async read(key: string): Promise<Buffer> {
    try {
      const fullPath = path.join(this.rootDir, key);
      return await fs.readFile(fullPath);
    } catch {
      throw Errors.notFound("File");
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const fullPath = path.join(this.rootDir, key);
      await fs.unlink(fullPath);
    } catch (err: unknown) {
      // Idempotent — ignore "not found"
      if (err && typeof err === "object" && "code" in err && err.code !== "ENOENT") {
        throw err;
      }
    }
  }
}

// Singleton (per-process)
let _storage: FsStorage | null = null;

export function getDocumentStorage(): IDocumentStorage {
  if (_storage) return _storage;
  _storage = new FsStorage(env.STORAGE_DIR);
  return _storage;
}

/** Test helper. */
export function _resetStorageForTests(): void {
  _storage = null;
}
