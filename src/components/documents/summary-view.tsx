"use client";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, RotateCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DisclaimerBanner } from "@/components/common/disclaimer-banner";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { Badge } from "@/components/ui/badge";
import type { DocumentOverview } from "@/types";

type AnalysisResponse = { cached: boolean; result: DocumentOverview };

async function fetchSummary(docId: string): Promise<AnalysisResponse> {
  const res = await fetch(`/api/documents/${docId}/analyze?type=summary`, {
    method: "POST",
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? "Failed to analyze");
  return json.data;
}

export function SummaryView({ docId }: { docId: string }) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["summary", docId],
    queryFn: () => fetchSummary(docId),
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

  const s = data?.result;
  if (!s) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Document overview</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RotateCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
          Re-run
        </Button>
      </div>

      <DisclaimerBanner />

      <Card>
        <CardHeader>
          <CardTitle>Plain-language summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed text-foreground">{s.plainLanguageSummary}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Document type</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{s.documentType ?? "Not specified"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Purpose</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{s.purpose ?? "Not specified"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parties</CardTitle>
          </CardHeader>
          <CardContent>
            {s.parties.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {s.parties.map((p) => (
                  <li key={p}>
                    <Badge variant="secondary">{p}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Not specified</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Effective date &amp; term</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm">
              <span className="text-muted-foreground">Effective:</span>{" "}
              <span className="font-medium">{s.effectiveDate ?? "Not specified"}</span>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Term:</span>{" "}
              <span className="font-medium">{s.term ?? "Not specified"}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {s.importantDates.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Important dates</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {s.importantDates.map((d, i) => (
                <li key={i} className="flex flex-col gap-1 border-l-2 border-primary/50 pl-3">
                  <span className="font-medium">{d.label}: {d.date}</span>
                  {d.context ? (
                    <span className="text-xs text-muted-foreground">{d.context}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {s.keyObligations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key obligations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {s.keyObligations.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment provisions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {s.paymentProvisions ?? "Not specified"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Termination provisions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {s.terminationProvisions ?? "Not specified"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
