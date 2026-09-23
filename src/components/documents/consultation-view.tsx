"use client";
import { useQuery } from "@tanstack/react-query";
import { RotateCw, AlertCircle, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { DisclaimerBanner } from "@/components/common/disclaimer-banner";
import { EmptyState } from "@/components/common/empty-state";
import type { ConsultationPrep } from "@/types";

type Response = { cached: boolean; result: ConsultationPrep };

async function fetchConsultation(docId: string): Promise<Response> {
  const res = await fetch(`/api/documents/${docId}/analyze?type=consultation`, {
    method: "POST",
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? "Failed to analyze");
  return json.data;
}

export function ConsultationView({ docId }: { docId: string }) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["consultation", docId],
    queryFn: () => fetchConsultation(docId),
  });

  if (isLoading) return <LoadingSkeleton />;
  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="size-5" aria-hidden="true" />
            <p>{(error as Error).message}</p>
          </div>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            <RotateCw className="size-4" aria-hidden="true" />
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const c = data?.result;
  if (!c) {
    return (
      <EmptyState
        title="No consultation pack yet"
        description="Generate a structured pack to bring to your lawyer."
        action={
          <Button onClick={() => refetch()}>
            <RotateCw className="size-4" aria-hidden="true" />
            Generate
          </Button>
        }
      />
    );
  }

  const exportText = formatConsultationForExport(c);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Consultation preparation</h2>
          <p className="text-sm text-muted-foreground">
            A structured pack to help you communicate with a qualified legal professional.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RotateCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
            Re-run
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const blob = new Blob([exportText], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "consultation-prep.txt";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="size-4" aria-hidden="true" />
            Export
          </Button>
        </div>
      </div>

      <DisclaimerBanner />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Document summary (to read aloud)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{c.documentSummary}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key clauses to ask about</CardTitle>
          </CardHeader>
          <CardContent>
            {c.keyClauses.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {c.keyClauses.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">None identified.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unclear provisions</CardTitle>
          </CardHeader>
          <CardContent>
            {c.unclearProvisions.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {c.unclearProvisions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">None identified.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Important dates</CardTitle>
          </CardHeader>
          <CardContent>
            {c.importantDates.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {c.importantDates.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">None identified.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Missing information</CardTitle>
          </CardHeader>
          <CardContent>
            {c.missingInformation.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {c.missingInformation.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">None identified.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Questions to ask your lawyer</CardTitle>
        </CardHeader>
        <CardContent>
          {c.questionsForLawyer.length > 0 ? (
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              {c.questionsForLawyer.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">None generated.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents to bring</CardTitle>
        </CardHeader>
        <CardContent>
          {c.documentsToBring.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {c.documentsToBring.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">None suggested.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatConsultationForExport(c: ConsultationPrep): string {
  return `CONSULTATION PREPARATION PACK
Generated by LegalLens AI
${new Date().toISOString()}

⚠ This is not legal advice. Consult a qualified legal professional.

DOCUMENT SUMMARY
${c.documentSummary}

KEY CLAUSES TO DISCUSS
${c.keyClauses.map((s, i) => `${i + 1}. ${s}`).join("\n")}

UNCLEAR PROVISIONS
${c.unclearProvisions.map((s, i) => `${i + 1}. ${s}`).join("\n")}

IMPORTANT DATES
${c.importantDates.map((s, i) => `${i + 1}. ${s}`).join("\n")}

MISSING INFORMATION
${c.missingInformation.map((s, i) => `${i + 1}. ${s}`).join("\n")}

QUESTIONS FOR YOUR LAWYER
${c.questionsForLawyer.map((s, i) => `${i + 1}. ${s}`).join("\n")}

DOCUMENTS TO BRING
${c.documentsToBring.map((s, i) => `${i + 1}. ${s}`).join("\n")}
`;
}
