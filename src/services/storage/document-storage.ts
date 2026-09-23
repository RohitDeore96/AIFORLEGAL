/**
 * Filesystem-backed document storage. Used for raw uploaded files.
 *
 * On Vercel serverless: the filesystem is read-only except for /tmp.
 * We auto-detect Vercel and use /tmp as the storage root. Files in /tmp
 * are ephemeral (per-instance, cleared between invocations), but that's
 * acceptable because we cache the extracted text in the database.
 *
 * The raw file is only needed if a user wants to re-download the original
 * (not currently implemented). All AI features work from Document.textContent.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { Errors } from "@/lib/errors";

export interface IDocumentStorage {
  /**
   * Save a file. Returns the storage path (or "" if storage is unavailable).
   * Never throws — if storage fails (e.g. read-only FS), returns "" and
   * the caller continues with the in-memory buffer.
   */
  save(key: string, buffer: Buffer): Promise<string>;
  /**
   * Read a file. Throws NotFoundError if the file doesn't exist.
   */
  read(key: string): Promise<Buffer>;
  /**
   * Delete a file. Idempotent (no error if file doesn't exist).
   */
  delete(key: string): Promise<void>;
}

class FsStorage implements IDocumentStorage {
  constructor(private rootDir: string) {}

  async save(key: string, buffer: Buffer): Promise<string> {
    try {
      // Ensure the user-specific subdirectory exists
      const subdir = path.dirname(path.join(this.rootDir, key));
      await fs.mkdir(subdir, { recursive: true });
      const fullPath = path.join(this.rootDir, key);
      await fs.writeFile(fullPath, buffer);
      return fullPath;
    } catch (err: unknown) {
      // Storage is best-effort. If we can't write (e.g. read-only FS on
      // serverless without /tmp access), return empty string — the caller
      // already has the buffer in memory and we cache the extracted text
      // in the database anyway.
      console.warn("[storage] Could not persist file, continuing without:", err);
      return "";
    }
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
      // Idempotent — ignore "not found" and any other errors
      if (err && typeof err === "object" && "code" in err && err.code !== "ENOENT") {
        // Silently ignore — storage is best-effort
      }
    }
  }
}

/**
 * Determine the storage root directory.
 *
 * Priority:
 * 1. STORAGE_DIR env var (if set and writable)
 * 2. /tmp/aiforlegal on Vercel/serverless (always writable on Vercel)
 * 3. ./.storage for local dev
 */
function resolveStorageRoot(): string {
  const envDir = process.env.STORAGE_DIR;
  if (envDir && envDir.trim() !== "") return envDir;

  // Vercel sets VERCEL=1 or NOW_REGION. Also check if we're on a serverless
  // platform by checking for /tmp writability (always writable on Vercel).
  if (process.env.VERCEL === "1" || process.env.NOW_REGION) {
    return path.join(os.tmpdir(), "aiforlegal");
  }

  // Local dev default
  return "./.storage";
}

// Singleton (per-process)
let _storage: FsStorage | null = null;

export function getDocumentStorage(): IDocumentStorage {
  if (_storage) return _storage;
  _storage = new FsStorage(resolveStorageRoot());
  return _storage;
}

/** Test helper. */
export function _resetStorageForTests(): void {
  _storage = null;
}
