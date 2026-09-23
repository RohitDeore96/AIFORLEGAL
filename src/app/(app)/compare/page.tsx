"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowRight, AlertCircle, GitCompare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import { DisclaimerBanner } from "@/components/common/disclaimer-banner";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ComparisonResult } from "@/types";
import { toast } from "sonner";

type DocListItem = {
  id: string;
  originalName: string;
  filename: string;
};

async function fetchDocs(): Promise<DocListItem[]> {
  const res = await fetch("/api/documents");
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? "Failed to load");
  return json.data;
}

async function runCompare(docAId: string, docBId: string): Promise<{ result: ComparisonResult }> {
  const res = await fetch("/api/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ docAId, docBId }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? "Comparison failed");
  return json.data;
}

export default function ComparePage() {
  const [docAId, setDocAId] = useState<string>("");
  const [docBId, setDocBId] = useState<string>("");

  const { data: docs, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: fetchDocs,
  });

  const cmp = useMutation({
    mutationFn: () => runCompare(docAId, docBId),
    onError: (err: Error) => toast.error(err.message),
  });

  const result = cmp.data?.result;

  if (isLoading) return <LoadingSkeleton />;

  if (!docs || docs.length < 2) {
    return (
      <EmptyState
        icon={GitCompare}
        title="Need at least 2 documents"
        description="Upload at least two documents to compare them. Comparisons are great for reviewing contract revisions or alternative versions."
      />
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Compare documents</h1>
        <p className="text-sm text-muted-foreground">
          Identify what was added, removed, or modified between two versions.
        </p>
      </header>

      <DisclaimerBanner />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select two documents</CardTitle>
          <CardDescription>Compare versions side by side</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid items-end gap-4 md:grid-cols-[1fr_auto_1fr]">
            <div className="space-y-2">
              <Label htmlFor="docA">Document A</Label>
              <Select value={docAId} onValueChange={setDocAId}>
                <SelectTrigger id="docA">
                  <SelectValue placeholder="Select document A" />
                </SelectTrigger>
                <SelectContent>
                  {docs
                    .filter((d) => d.id !== docBId)
                    .map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.originalName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="hidden md:block pb-2.5">
              <ArrowRight className="size-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="docB">Document B</Label>
              <Select value={docBId} onValueChange={setDocBId}>
                <SelectTrigger id="docB">
                  <SelectValue placeholder="Select document B" />
                </SelectTrigger>
                <SelectContent>
                  {docs
                    .filter((d) => d.id !== docAId)
                    .map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.originalName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            className="mt-4 w-full md:w-auto"
            onClick={() => cmp.mutate()}
            disabled={!docAId || !docBId || docAId === docBId || cmp.isPending}
          >
            <GitCompare className="size-4" aria-hidden="true" />
            {cmp.isPending ? "Comparing…" : "Compare documents"}
          </Button>
        </CardContent>
      </Card>

      {cmp.isPending ? <LoadingSkeleton /> : null}
      {cmp.isError ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5" aria-hidden="true" />
              <p>{(cmp.error as Error).message}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {result ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{result.summary}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Differences ({result.diffs.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.diffs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No material differences detected.</p>
              ) : (
                result.diffs.map((d, i) => (
                  <div key={i} className="rounded-lg border p-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {d.category.replace(/_/g, " ")}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          d.change === "ADDED"
                            ? "border-emerald-500 text-emerald-700 dark:text-emerald-400"
                            : d.change === "REMOVED"
                              ? "border-red-500 text-red-700 dark:text-red-400"
                              : ""
                        }
                      >
                        {d.change}
                      </Badge>
                    </div>
                    <p className="text-sm">{d.description}</p>
                    <div className="grid gap-2 sm:grid-cols-2 text-xs">
                      <div>
                        <p className="font-semibold text-muted-foreground">Document A:</p>
                        {d.docALocation ? (
                          <p className="italic mt-1">&ldquo;{d.docALocation}&rdquo;</p>
                        ) : (
                          <p className="mt-1 text-muted-foreground">— not present —</p>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-muted-foreground">Document B:</p>
                        {d.docBLocation ? (
                          <p className="italic mt-1">&ldquo;{d.docBLocation}&rdquo;</p>
                        ) : (
                          <p className="mt-1 text-muted-foreground">— not present —</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold">Why it matters:</span> {d.whyItMatters}
                    </p>
                    {d.suggestedQuestions.length > 0 ? (
                      <div className="text-xs">
                        <p className="font-semibold text-muted-foreground">Ask your lawyer:</p>
                        <ul className="mt-1 list-disc pl-4">
                          {d.suggestedQuestions.map((q, j) => <li key={j}>{q}</li>)}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Overall risk note</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {result.overallRiskNote}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
