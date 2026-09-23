import { describe, it, expect } from "vitest";
import { MockProvider } from "@/services/ai/mock-provider";
import { SummarySchema } from "@/services/ai/prompts/summary";
import { ClausesSchema } from "@/services/ai/prompts/clauses";
import { QaSchema } from "@/services/ai/prompts/qa";
import { ObligationsSchema } from "@/services/ai/prompts/obligations";
import { ChecklistSchema } from "@/services/ai/prompts/checklist";
import { ConsultationSchema } from "@/services/ai/prompts/consultation";
import { ComparisonSchema } from "@/services/ai/prompts/comparison";

describe("MockProvider", () => {
  const provider = new MockProvider();

  it("generates a valid summary", async () => {
    const result = await provider.generateStructured(
      "system",
      "user prompt",
      SummarySchema,
    );
    expect(result.data.documentType).toBe("Service Agreement");
    expect(result.data.parties).toContain("Customer");
    expect(result.data.parties).toContain("Service Provider");
    expect(result.data.plainLanguageSummary).toBeTruthy();
    expect(result.model).toBe("mock-1");
  });

  it("generates valid clauses", async () => {
    const result = await provider.generateStructured(
      "system",
      "user prompt",
      ClausesSchema,
    );
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
    const first = result.data[0];
    expect(first.name).toBeTruthy();
    expect(first.category).toBeTruthy();
    expect(first.plainLanguageExplanation).toBeTruthy();
    expect(first.sourceLocation.snippet).toBeTruthy();
  });

  it("generates a valid Q&A answer", async () => {
    const result = await provider.generateStructured(
      "system",
      "user prompt",
      QaSchema,
    );
    expect(result.data.answer).toBeTruthy();
    expect(result.data.confidence).toBe("high");
    expect(result.data.citations.length).toBeGreaterThan(0);
    expect(result.data.followUpQuestions.length).toBeGreaterThan(0);
  });

  it("generates valid obligations", async () => {
    const result = await provider.generateStructured(
      "system",
      "user prompt",
      ObligationsSchema,
    );
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data[0].party).toBeTruthy();
    expect(result.data[0].obligation).toBeTruthy();
    expect(result.data[0].source).toBeTruthy();
  });

  it("generates a valid checklist", async () => {
    const result = await provider.generateStructured(
      "system",
      "user prompt",
      ChecklistSchema,
    );
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.some((i) => i.category === "PROFESSIONAL_HELP")).toBe(true);
  });

  it("generates a valid consultation prep", async () => {
    const result = await provider.generateStructured(
      "system",
      "user prompt",
      ConsultationSchema,
    );
    expect(result.data.documentSummary).toBeTruthy();
    expect(result.data.questionsForLawyer.length).toBeGreaterThan(0);
  });

  it("generates a valid comparison", async () => {
    const result = await provider.generateStructured(
      "system",
      "user prompt",
      ComparisonSchema,
    );
    expect(result.data.summary).toBeTruthy();
    expect(result.data.diffs.length).toBeGreaterThan(0);
    expect(result.data.overallRiskNote).toBeTruthy();
  });

  it("generateText returns a string", async () => {
    const result = await provider.generateText("system", "user prompt");
    expect(typeof result.text).toBe("string");
    expect(result.text.length).toBeGreaterThan(0);
  });
});

describe("Zod schemas reject invalid AI output", () => {
  it("SummarySchema rejects missing plainLanguageSummary", () => {
    const result = SummarySchema.safeParse({
      documentType: "Contract",
      parties: ["A"],
      // missing plainLanguageSummary
    });
    expect(result.success).toBe(false);
  });

  it("ClausesSchema coerces invalid category to OTHER (lenient)", () => {
    const result = ClausesSchema.safeParse([
      {
        name: "Test",
        category: "INVALID_CATEGORY",
        plainLanguageExplanation: "...",
        sourceLocation: { page: 1, section: "1", snippet: "..." },
        whyItMatters: "...",
        suggestedQuestions: [],
      },
    ]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].category).toBe("OTHER");
    }
  });

  it("QaSchema coerces invalid confidence to 'low' (lenient)", () => {
    const result = QaSchema.safeParse({
      answer: "...",
      citations: [],
      confidence: "very_confident",
      followUpQuestions: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.confidence).toBe("low");
    }
  });

  it("ObligationsSchema rejects an obligation without source", () => {
    const result = ObligationsSchema.safeParse([
      { party: "A", obligation: "Do X", deadline: null, condition: null },
    ]);
    expect(result.success).toBe(false);
  });

  it("SummarySchema accepts null for array fields (Gemini often returns null)", () => {
    const result = SummarySchema.safeParse({
      documentType: "Contract",
      purpose: null,
      parties: null,           // Gemini sometimes returns null instead of []
      effectiveDate: null,
      term: null,
      keyObligations: null,
      importantDates: null,
      paymentProvisions: null,
      terminationProvisions: null,
      majorResponsibilities: null,
      plainLanguageSummary: "A summary.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parties).toEqual([]);
      expect(result.data.keyObligations).toEqual([]);
      expect(result.data.importantDates).toEqual([]);
    }
  });

  it("ClausesSchema accepts null (Gemini sometimes returns null instead of [])", () => {
    const result = ClausesSchema.safeParse(null);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  it("QaSchema accepts null for citations array", () => {
    const result = QaSchema.safeParse({
      answer: "Test answer",
      citations: null,
      confidence: "high",
      followUpQuestions: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.citations).toEqual([]);
      expect(result.data.followUpQuestions).toEqual([]);
    }
  });
});
