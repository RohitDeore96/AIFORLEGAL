"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, RotateCw, AlertCircle, ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { toast } from "sonner";

type ChecklistItem = {
  id: string;
  label: string;
  rationale: string | null;
  completed: boolean;
  sortOrder: number;
};

async function fetchChecklist(docId: string): Promise<ChecklistItem[]> {
  const res = await fetch(`/api/documents/${docId}/checklist`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? "Failed to load");
  return json.data;
}

async function generateChecklist(docId: string): Promise<void> {
  const res = await fetch(`/api/documents/${docId}/checklist`, { method: "POST" });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? "Failed to generate");
}

async function toggleItem(
  docId: string,
  itemId: string,
  completed: boolean,
): Promise<void> {
  const res = await fetch(`/api/documents/${docId}/checklist`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId, completed }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? "Failed to update");
}

const CATEGORY_COLORS: Record<string, string> = {
  PAYMENT: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  TERMINATION: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  OBLIGATIONS: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  RISK: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  PROCESS: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  PROFESSIONAL_HELP: "bg-primary/10 text-primary",
};

function inferCategory(item: ChecklistItem): string {
  const text = `${item.label} ${item.rationale ?? ""}`.toLowerCase();
  if (text.includes("lawyer") || text.includes("legal professional")) return "PROFESSIONAL_HELP";
  if (text.includes("pay")) return "PAYMENT";
  if (text.includes("terminat")) return "TERMINATION";
  if (text.includes("obligat")) return "OBLIGATIONS";
  if (text.includes("risk") || text.includes("review")) return "RISK";
  return "PROCESS";
}

export function ChecklistView({ docId }: { docId: string }) {
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["checklist", docId],
    queryFn: () => fetchChecklist(docId),
  });

  const gen = useMutation({
    mutationFn: () => generateChecklist(docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklist", docId] });
      toast.success("Checklist generated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggle = useMutation({
    mutationFn: ({ itemId, completed }: { itemId: string; completed: boolean }) =>
      toggleItem(docId, itemId, completed),
    onMutate: async ({ itemId, completed }) => {
      const prev = qc.getQueryData<ChecklistItem[]>(["checklist", docId]) ?? [];
      const next = prev.map((it) =>
        it.id === itemId ? { ...it, completed } : it,
      );
      qc.setQueryData(["checklist", docId], next);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["checklist", docId], ctx.prev);
      toast.error("Failed to update item");
    },
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
        </CardContent>
      </Card>
    );
  }

  const items = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Action checklist</h2>
          <p className="text-sm text-muted-foreground">
            A personalized, document-grounded list of things to review.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => gen.mutate()}
          disabled={gen.isPending}
        >
          <RotateCw className={`size-4 ${gen.isPending ? "animate-spin" : ""}`} aria-hidden="true" />
          {items.length === 0 ? "Generate checklist" : "Regenerate"}
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No checklist yet"
          description="Generate a personalized action checklist based on your document."
          action={
            <Button onClick={() => gen.mutate()} disabled={gen.isPending}>
              {gen.isPending ? "Generating…" : "Generate checklist"}
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-2">
            <ul className="divide-y">
              {items.map((item) => {
                const cat = inferCategory(item);
                const completed = item.completed;
                return (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 p-3 transition-colors hover:bg-muted/30"
                  >
                    <Checkbox
                      id={`item-${item.id}`}
                      checked={completed}
                      onCheckedChange={(checked) =>
                        toggle.mutate({ itemId: item.id, completed: checked === true })
                      }
                      className="mt-1"
                      aria-label={item.label}
                    />
                    <div className="flex-1 space-y-1">
                      <label
                        htmlFor={`item-${item.id}`}
                        className={`text-sm font-medium leading-snug cursor-pointer ${
                          completed ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {item.label}
                      </label>
                      {item.rationale ? (
                        <p className="text-xs text-muted-foreground">{item.rationale}</p>
                      ) : null}
                      <Badge
                        className={`text-[10px] ${CATEGORY_COLORS[cat] ?? "bg-muted text-muted-foreground"}`}
                        variant="secondary"
                      >
                        {cat.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    {completed ? (
                      <Check className="size-4 text-emerald-500 mt-1" aria-hidden="true" />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
