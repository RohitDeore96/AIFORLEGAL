"use client";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Trash2, Upload as UploadIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { formatBytes, formatDate } from "@/lib/format";
import { toast } from "sonner";

type DocListItem = {
  id: string;
  originalName: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  wordCount: number | null;
  pageCount: number | null;
  language: string | null;
  createdAt: string;
  updatedAt: string;
  errorMessage: string | null;
};

async function fetchDocs(): Promise<DocListItem[]> {
  const res = await fetch("/api/documents");
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? "Failed to load");
  return json.data;
}

async function deleteDoc(id: string): Promise<void> {
  const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? "Failed to delete");
}

export default function DashboardPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["documents"],
    queryFn: fetchDocs,
  });

  const del = useMutation({
    mutationFn: deleteDoc,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your documents</h1>
          <p className="text-sm text-muted-foreground">
            All documents are private to your account.
          </p>
        </div>
        <Button asChild>
          <Link href="/upload">
            <UploadIcon className="size-4" aria-hidden="true" />
            Upload document
          </Link>
        </Button>
      </header>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <LoadingSkeleton />
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5" aria-hidden="true" />
              <p>{(error as Error).message}</p>
            </div>
          </CardContent>
        </Card>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Upload your first legal document to get started. We support PDF, DOCX, and TXT files."
          action={
            <Button asChild>
              <Link href="/upload">
                <UploadIcon className="size-4" aria-hidden="true" />
                Upload document
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((doc) => (
            <li key={doc.id}>
              <Card className="group h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      <FileText className="size-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base" title={doc.originalName}>
                        <Link
                          href={`/documents/${doc.id}/summary`}
                          className="hover:underline"
                        >
                          {doc.originalName}
                        </Link>
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs">
                        {doc.wordCount ?? 0} words
                        {doc.pageCount ? ` • ${doc.pageCount} pages` : ""}
                        {doc.language ? ` • ${doc.language.toUpperCase()}` : ""}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatBytes(doc.sizeBytes)}</span>
                    <time dateTime={doc.createdAt}>{formatDate(doc.createdAt)}</time>
                  </div>
                  {doc.status === "FAILED" ? (
                    <p className="text-xs text-destructive">
                      {doc.errorMessage ?? "Processing failed"}
                    </p>
                  ) : null}
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/documents/${doc.id}/summary`}>Open</Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={`Delete ${doc.originalName}`}
                      onClick={() => {
                        if (confirm(`Delete "${doc.originalName}"? This cannot be undone.`)) {
                          del.mutate(doc.id);
                        }
                      }}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
