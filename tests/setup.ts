/**
 * Set env vars for tests BEFORE any module that imports @/lib/env loads.
 */
process.env.DATABASE_URL = "file::memory:?cache=shared";
process.env.NEXTAUTH_SECRET = "test-secret";
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.AI_PROVIDER = "mock";
process.env.STORAGE_DIR = "/tmp/aiforlegal-test-storage";
process.env.NODE_ENV = "test";
