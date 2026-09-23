/**
 * Mock provider — deterministic stubs for tests and offline demo.
 * Produces realistic-looking structured output WITHOUT any network calls.
 *
 * Used:
 *   - In automated tests (no API key required)
 *   - As the default provider when no AI credentials are configured
 *     (so the app runs in "demo mode" on first deploy)
 */
import type { AiProvider, AiGenerateOptions } from "../provider";
import type { ZodType } from "zod";

export class MockProvider implements AiProvider {
  readonly name = "mock";
  readonly model = "mock-1";

  async generateText(
    systemInstruction: string,
    userPrompt: string,
    _options?: AiGenerateOptions,
  ) {
    return {
      text: `Mock response for prompt of length ${userPrompt.length}. (No AI provider configured — set GOOGLE_GEMINI_API_KEY for real responses.)`,
      model: this.model,
      tokenUsage: 0,
      durationMs: 0,
    };
  }

  async generateStructured<T>(
    _systemInstruction: string,
    userPrompt: string,
    schema: ZodType<T>,
    _options?: AiGenerateOptions,
  ) {
    // Generate a sample matching the schema by inferring shape from the prompt.
    const sample = generateSampleFor(schema, userPrompt);
    return {
      data: sample,
      rawText: JSON.stringify(sample),
      model: this.model,
      tokenUsage: 0,
      durationMs: 0,
    };
  }
}

/**
 * Walks the zod schema to produce a placeholder value.
 * This is intentionally simple — mock provider is for demos/tests only.
 */
function generateSampleFor<T>(schema: ZodType<T>, prompt: string): T {
  // Use the schema's own parsing on a synthesized object.
  // We try several common shapes and let zod refine.
  const candidates: unknown[] = [
    // If schema is an array of objects
    [{
      name: "Termination for Convenience",
      category: "TERMINATION",
      plainLanguageExplanation: "Either party may end this agreement at any time by giving written notice.",
      sourceLocation: {
        page: 3,
        section: "Section 8.2",
        snippet: "Either party may terminate this Agreement for convenience upon thirty (30) days written notice.",
      },
      whyItMatters: "Allows exit from the contract without cause, but requires advance notice.",
      suggestedQuestions: ["What happens to pending payments if we terminate for convenience?"],
    }],
    // If schema is a single object (summary/consultation)
    {
      documentType: "Service Agreement",
      purpose: "Engages a service provider to deliver the described services to the customer.",
      parties: ["Customer", "Service Provider"],
      effectiveDate: "2024-01-01",
      term: "12 months, auto-renewing",
      keyObligations: ["Customer must pay invoices within 30 days", "Provider must deliver services with reasonable skill"],
      importantDates: [
        { label: "Effective Date", date: "2024-01-01" },
        { label: "Renewal Date", date: "2025-01-01" },
      ],
      paymentProvisions: "Customer pays $5,000/month, net 30.",
      terminationProvisions: "30 days written notice for convenience; immediate for material breach.",
      majorResponsibilities: ["Provider delivers services", "Customer pays invoices"],
      plainLanguageSummary: "This is a one-year service agreement between the Customer and the Service Provider. The Provider will deliver the described services and the Customer will pay $5,000 per month. Either party can end the agreement with 30 days' notice.",
    },
    // Q&A shape
    {
      answer: "Based on the document, either party may terminate this agreement for convenience by giving 30 days' written notice. For material breach, the non-breaching party may terminate immediately.",
      citations: [{
        chunkId: "mock-chunk-1",
        snippet: "Either party may terminate this Agreement for convenience upon thirty (30) days written notice.",
        page: 3,
        section: "Section 8.2",
      }],
      confidence: "high" as const,
      followUpQuestions: [
        "What constitutes material breach under this agreement?",
        "Are there any termination fees?",
      ],
    },
    // Obligations shape
    [{
      party: "Customer",
      obligation: "Pay all invoices within 30 days of receipt.",
      deadline: "30 days from invoice date",
      condition: "Receipt of a valid invoice",
      source: "Customer shall pay all undisputed invoices within thirty (30) days of receipt.",
    }],
    // Consultation shape
    {
      documentSummary: "This is a service agreement between the Customer and the Service Provider, effective January 1, 2024, for a 12-month term.",
      keyClauses: ["Termination for Convenience", "Payment Terms", "Confidentiality"],
      unclearProvisions: ["The scope of 'reasonable skill and care' is not precisely defined"],
      importantDates: ["Effective Date: January 1, 2024", "Renewal Date: January 1, 2025"],
      missingInformation: ["No governing law clause", "No dispute resolution mechanism specified"],
      questionsForLawyer: [
        "What state's laws govern this agreement?",
        "How should disputes be resolved — mediation, arbitration, or court?",
        "What constitutes 'material breach' under Section 8.3?",
      ],
      documentsToBring: ["Any prior versions of this contract", "Communications with the Service Provider"],
    },
    // Checklist shape
    [
      { label: "Confirm payment terms ($5,000/month, net 30)", rationale: "The document specifies these exact payment terms in Section 4.", category: "PAYMENT" as const },
      { label: "Note the renewal date (January 1, 2025)", rationale: "The agreement auto-renews on this date unless terminated.", category: "PROCESS" as const },
      { label: "Review the 30-day termination notice requirement", rationale: "Section 8.2 requires 30 days' written notice for convenience termination.", category: "TERMINATION" as const },
      { label: "Review confidentiality obligations", rationale: "Section 6 imposes confidentiality duties that survive termination.", category: "OBLIGATIONS" as const },
      { label: "Check what 'reasonable skill and care' means", rationale: "The standard of performance in Section 3 is not precisely defined.", category: "RISK" as const },
      { label: "Discuss unclear provisions with a qualified legal professional", rationale: "Several clauses are ambiguous and warrant professional review.", category: "PROFESSIONAL_HELP" as const },
    ],
    // Comparison shape
    {
      summary: "Document B introduces a new auto-renewal clause, increases the payment term from 30 to 45 days, and adds an indemnification clause not present in Document A.",
      diffs: [
        {
          category: "PAYMENT",
          change: "MODIFIED",
          description: "Payment term changed from 30 days to 45 days.",
          docALocation: "Customer shall pay all undisputed invoices within thirty (30) days of receipt.",
          docBLocation: "Customer shall pay all undisputed invoices within forty-five (45) days of receipt.",
          whyItMatters: "Longer payment terms affect cash flow for the Service Provider.",
          suggestedQuestions: ["Why was the payment term extended?"],
        },
        {
          category: "RENEWAL",
          change: "ADDED",
          description: "Document B adds an automatic renewal clause.",
          docALocation: null,
          docBLocation: "This Agreement shall automatically renew for successive 12-month terms unless either party provides 60 days' written notice.",
          whyItMatters: "Auto-renewal can lock the customer into the contract unless they remember to cancel.",
          suggestedQuestions: ["How do I cancel the auto-renewal?"],
        },
        {
          category: "INDEMNIFICATION",
          change: "ADDED",
          description: "Document B adds a mutual indemnification clause.",
          docALocation: null,
          docBLocation: "Each party shall indemnify the other for any third-party claims arising from its breach of this Agreement.",
          whyItMatters: "Indemnification shifts liability and could result in significant costs.",
          suggestedQuestions: ["Are there caps on indemnification liability?"],
        },
      ],
      overallRiskNote: "Document B shifts more risk to the customer by adding indemnification obligations and auto-renewal. The longer payment term benefits the customer but may strain the provider relationship.",
    },
    // Generic fallback
    { note: "Mock response — no AI provider configured." },
  ];

  for (const candidate of candidates) {
    const result = schema.safeParse(candidate);
    if (result.success) {
      return result.data;
    }
  }
  // Last resort — return a string
  return "Mock response" as T;
}
