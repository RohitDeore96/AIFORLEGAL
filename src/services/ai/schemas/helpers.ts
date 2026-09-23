/**
 * Shared zod helpers for AI output schemas.
 *
 * Gemini (and other LLMs) often return null where an array or string is
 * expected, even when the schema says "use an empty array". These helpers
 * coerce null/undefined to the appropriate default so validation doesn't fail.
 */
import { z } from "zod";

/**
 * Array field that accepts null and converts it to [].
 * Also accepts a single string and wraps it in an array.
 */
export const nullableArray = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.preprocess((val) => {
    if (val === null || val === undefined) return [];
    if (typeof val === "string") return [val];
    if (typeof val === "object" && !Array.isArray(val)) return [val];
    return val;
  }, z.array(itemSchema).default([]));

/**
 * String field that accepts null and converts it to null (for nullable strings).
 */
export const nullableString = z.string().nullable();

/**
 * Optional string field that accepts null and converts it to undefined.
 */
export const optionalString = z.preprocess((val) => {
  if (val === null || val === undefined || val === "") return undefined;
  return val;
}, z.string().optional());
