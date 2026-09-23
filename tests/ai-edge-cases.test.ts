import { describe, it, expect, beforeEach } from "vitest";
import { MockProvider } from "@/services/ai/mock-provider";
import { SummarySchema } from "@/services/ai/prompts/summary";
import { ClausesSchema } from "@/services/ai/prompts/clauses";
import { QaSchema } from "@/services/ai/prompts/qa";
import { ObligationsSchema } from "@/services/ai/prompts/obligations";
import { ChecklistSchema } from "@/services/ai/prompts/checklist";
import { ConsultationSchema } from "@/services/ai/prompts/consultation";
import { ComparisonSchema } from "@/services/ai/prompts/comparison";

/**
 * AI edge case tests — verify that the zod schemas handle the messy
 * reality of LLM output, including:
 *
 * 1. null where arrays are expected (very common Gemini behavior)
 * 2. Empty strings for required fields
 * 3. Unexpected enum values
 * 4. Missing optional fields
 * 5. Extra/unexpected fields (should be stripped, not rejected)
 * 6. Type mismatches (number where string expected)
 *
 * These tests ensure the app degrades gracefully when the AI returns
 * imperfect output instead of crashing with "AI returned an invalid response".
 */

describe("AI Edge Cases: Null Arrays (Gemini's most common deviation)", () => {
  it("SummarySchema handles null for all array fields", () => {
    const result = SummarySchema.safeParse({
      documentType: "Contract",
      purpose: null,
      parties: null,
      keyObligations: null,
      importantDates: null,
      majorResponsibilities: null,
      effectiveDate: null,
      term: null,
      paymentProvisions: null,
      terminationProvisions: null,
      plainLanguageSummary: "A summary.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parties).toEqual([]);
      expect(result.data.keyObligations).toEqual([]);
      expect(result.data.importantDates).toEqual([]);
      expect(result.data.majorResponsibilities).toEqual([]);
    }
  });

  it("ClausesSchema handles null (entire response is null)", () => {
    const result = ClausesSchema.safeParse(null);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  it("QaSchema handles null for citations and followUpQuestions", () => {
    const result = QaSchema.safeParse({
      answer: "Based on the document...",
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

  it("ConsultationSchema handles null for all array fields", () => {
    const result = ConsultationSchema.safeParse({
      documentSummary: "Summary text.",
      keyClauses: null,
      unclearProvisions: null,
      importantDates: null,
      missingInformation: null,
      questionsForLawyer: null,
      documentsToBring: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.keyClauses).toEqual([]);
      expect(result.data.questionsForLawyer).toEqual([]);
    }
  });
});

describe("AI Edge Cases: Unexpected Enum Values", () => {
  it("ClausesSchema coerces invalid category to 'OTHER'", () => {
    const result = ClausesSchema.safeParse([
      {
        name: "Unknown Clause",
        category: "RANDOM_CATEGORY",
        plainLanguageExplanation: "...",
        sourceLocation: { snippet: "..." },
        whyItMatters: "...",
        suggestedQuestions: [],
      },
    ]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].category).toBe("OTHER");
    }
  });

  it("QaSchema coerces invalid confidence to 'low'", () => {
    const result = QaSchema.safeParse({
      answer: "Answer",
      citations: [],
      confidence: "very_confident",
      followUpQuestions: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.confidence).toBe("low");
    }
  });

  it("ChecklistSchema coerces invalid category to 'PROCESS'", () => {
    const result = ChecklistSchema.safeParse([
      {
        label: "Review document",
        rationale: "Important",
        category: "UNKNOWN_CATEGORY",
      },
    ]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].category).toBe("PROCESS");
    }
  });

  it("ComparisonSchema coerces invalid change type to 'MODIFIED'", () => {
    const result = ComparisonSchema.safeParse({
      summary: "Summary",
      diffs: [
        {
          category: "PAYMENT",
          change: "UPDATED", // invalid — should be ADDED/REMOVED/MODIFIED
          description: "...",
          docALocation: null,
          docBLocation: null,
          whyItMatters: "...",
          suggestedQuestions: [],
        },
      ],
      overallRiskNote: "Note",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.diffs[0].change).toBe("MODIFIED");
    }
  });
});

describe("AI Edge Cases: Type Mismatches", () => {
  it("SummarySchema handles number where string expected (dates)", () => {
    const result = SummarySchema.safeParse({
      documentType: "Contract",
      purpose: "Service agreement",
      parties: ["A", "B"],
      effectiveDate: 20240101, // number instead of string
      term: 12, // number instead of string
      keyObligations: [],
      importantDates: [
        { label: "Start", date: 20240101 }, // number
      ],
      paymentProvisions: "$1000/month",
      terminationProvisions: "30 days notice",
      majorResponsibilities: [],
      plainLanguageSummary: "Summary.",
    });
    // Should either coerce or fail gracefully
    expect(result.success).toBe(true);
  });

  it("ClausesSchema handles string where array expected (suggestedQuestions)", () => {
    const result = ClausesSchema.safeParse([
      {
        name: "Test",
        category: "TERMINATION",
        plainLanguageExplanation: "...",
        sourceLocation: { snippet: "..." },
        whyItMatters: "...",
        suggestedQuestions: "What is the notice period?", // string not array
      },
    ]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Array.isArray(result.data[0].suggestedQuestions)).toBe(true);
    }
  });
});

describe("AI Edge Cases: Missing Fields", () => {
  it("SummarySchema rejects missing plainLanguageSummary (required field)", () => {
    const result = SummarySchema.safeParse({
      documentType: "Contract",
      parties: ["A"],
    });
    expect(result.success).toBe(false);
  });

  it("ObligationsSchema rejects missing source (required field)", () => {
    const result = ObligationsSchema.safeParse([
      { party: "A", obligation: "Do X", deadline: null, condition: null },
    ]);
    expect(result.success).toBe(false);
  });

  it("ClausesSchema rejects missing snippet (required field)", () => {
    const result = ClausesSchema.safeParse([
      {
        name: "Test",
        category: "TERMINATION",
        plainLanguageExplanation: "...",
        sourceLocation: {}, // missing snippet
        whyItMatters: "...",
      },
    ]);
    expect(result.success).toBe(false);
  });
});

describe("AI Edge Cases: Extra Fields (Graceful Handling)", () => {
  it("SummarySchema strips unexpected fields", () => {
    const result = SummarySchema.safeParse({
      documentType: "Contract",
      purpose: "Test",
      parties: ["A"],
      effectiveDate: "2024-01-01",
      term: "1 year",
      keyObligations: [],
      importantDates: [],
      paymentProvisions: "Net 30",
      terminationProvisions: "30 days",
      majorResponsibilities: [],
      plainLanguageSummary: "Summary.",
      // Extra fields:
      extraField: "should be ignored",
      anotherExtra: 123,
    });
    expect(result.success).toBe(true);
    // zod by default strips unknown keys
  });
});

describe("AI Edge Cases: Empty/Minimal Responses", () => {
  it("ClausesSchema accepts empty array (no clauses found)", () => {
    const result = ClausesSchema.safeParse([]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  it("ObligationsSchema accepts empty array", () => {
    const result = ObligationsSchema.safeParse([]);
    expect(result.success).toBe(true);
  });

  it("ChecklistSchema accepts empty array", () => {
    const result = ChecklistSchema.safeParse([]);
    expect(result.success).toBe(true);
  });

  it("QaSchema accepts empty citations (insufficient confidence)", () => {
    const result = QaSchema.safeParse({
      answer: "Not found in the provided document.",
      citations: [],
      confidence: "insufficient",
      followUpQuestions: [],
    });
    expect(result.success).toBe(true);
  });
});

describe("AI Edge Cases: MockProvider Produces Valid Output", () => {
  const provider = new MockProvider();

  it("all 7 schemas accept MockProvider output", async () => {
    const schemas = [
      { name: "Summary", schema: SummarySchema },
      { name: "Clauses", schema: ClausesSchema },
      { name: "Qa", schema: QaSchema },
      { name: "Obligations", schema: ObligationsSchema },
      { name: "Checklist", schema: ChecklistSchema },
      { name: "Consultation", schema: ConsultationSchema },
      { name: "Comparison", schema: ComparisonSchema },
    ];

    for (const { name, schema } of schemas) {
      const result = await provider.generateStructured("sys", "user", schema);
      expect(result.data, `${name} should produce valid output`).toBeDefined();
    }
  });
});
