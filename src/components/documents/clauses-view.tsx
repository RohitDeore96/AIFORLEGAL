"use client";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, RotateCw, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { EmptyState } from "@/components/common/empty-state";
import type { IdentifiedClause } from "@/types";

type Response = { cached: boolean; result: IdentifiedClause[] };

async function fetchClauses(docId: string): Promise<Response> {
  const res = await fetch(`/api/documents/${docId}/analyze?type=clauses`, {
    method: "POST",
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? "Failed to analyze");
  return json.data;
}

const CATEGORY_COLORS: Record<string, string> = {
  TERMINATION: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  PAYMENT: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  FEES: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  CONFIDENTIALITY: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  LIABILITY: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  INDEMNIFICATION: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  GOVERNING_LAW: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  DISPUTE_RESOLUTION: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  DATA_PROTECTION: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  NON_COMPETE: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
  NON_SOLICITATION: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
  FORCE_MAJEURE: "bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200",
};

export function ClausesView({ docId }: { docId: string }) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["clauses", docId],
    queryFn: () => fetchClauses(docId),
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

  const clauses = data?.result ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Identified clauses</h2>
          <p className="text-sm text-muted-foreground">
            {clauses.length === 0
              ? "No clauses identified yet."
              : `${clauses.length} clause${clauses.length === 1 ? "" : "s"} found.`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RotateCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
          Re-run
        </Button>
      </div>

      {clauses.length === 0 ? (
        <EmptyState
          title="No clauses found"
          description="This document may not contain any of the clause types we look for, or it may be too short."
        />
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {clauses.map((clause, i) => (
            <AccordionItem
              key={i}
              value={`clause-${i}`}
              className="rounded-lg border bg-background px-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <Badge
                    className={`shrink-0 ${CATEGORY_COLORS[clause.category] ?? "bg-muted text-muted-foreground"}`}
                    variant="secondary"
                  >
                    {clause.category.replace(/_/g, " ")}
                  </Badge>
                  <span className="font-medium">{clause.name}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                    What it says
                  </h4>
                  <p className="mt-1 text-sm leading-relaxed">
                    {clause.plainLanguageExplanation}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/30 p-3">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                    Source text
                    {clause.sourceLocation.page ? ` • page ${clause.sourceLocation.page}` : ""}
                    {clause.sourceLocation.section ? ` • ${clause.sourceLocation.section}` : ""}
                  </h4>
                  <p className="mt-1 text-sm italic">
                    &ldquo;{clause.sourceLocation.snippet}&rdquo;
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                    Why it may matter
                  </h4>
                  <p className="mt-1 text-sm leading-relaxed">{clause.whyItMatters}</p>
                </div>
                {clause.suggestedQuestions.length > 0 ? (
                  <div>
                    <h4 className="flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
                      <HelpCircle className="size-3" aria-hidden="true" />
                      Questions to consider
                    </h4>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                      {clause.suggestedQuestions.map((q, j) => (
                        <li key={j}>{q}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
