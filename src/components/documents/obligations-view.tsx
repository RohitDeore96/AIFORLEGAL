"use client";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, RotateCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { EmptyState } from "@/components/common/empty-state";
import type { Obligation } from "@/types";

type Response = { cached: boolean; result: Obligation[] };

async function fetchObligations(docId: string): Promise<Response> {
  const res = await fetch(`/api/documents/${docId}/analyze?type=obligations`, {
    method: "POST",
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? "Failed to analyze");
  return json.data;
}

export function ObligationsView({ docId }: { docId: string }) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["obligations", docId],
    queryFn: () => fetchObligations(docId),
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

  const obligations = data?.result ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Obligations &amp; deadlines</h2>
          <p className="text-sm text-muted-foreground">
            Who must do what, by when, and under what condition.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RotateCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
          Re-run
        </Button>
      </div>

      {obligations.length === 0 ? (
        <EmptyState
          title="No obligations extracted"
          description="This document may not contain explicit obligations, or the AI could not identify any with sufficient confidence."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Extracted obligations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Party</TableHead>
                    <TableHead>Obligation</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead className="w-1/3">Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {obligations.map((o, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{o.party}</TableCell>
                      <TableCell>{o.obligation}</TableCell>
                      <TableCell>{o.deadline ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{o.condition ?? "—"}</TableCell>
                      <TableCell className="text-xs italic text-muted-foreground">
                        &ldquo;{o.source}&rdquo;
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
