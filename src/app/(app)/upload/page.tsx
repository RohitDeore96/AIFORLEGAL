"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Upload as UploadIcon, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DisclaimerBanner } from "@/components/common/disclaimer-banner";
import { toast } from "sonner";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

export default function UploadPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      setError(null);
      setProgress(0);

      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/documents");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        setProgress(null);
        try {
          const json = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && json.ok) {
            toast.success("Document uploaded");
            router.push(`/documents/${json.data.id}/summary`);
          } else {
            setError(json?.error?.message ?? "Upload failed");
            toast.error(json?.error?.message ?? "Upload failed");
          }
        } catch {
          setError("Upload failed. Please try again.");
          toast.error("Upload failed");
        }
      };
      xhr.onerror = () => {
        setProgress(null);
        setError("Network error. Please try again.");
        toast.error("Network error");
      };
      xhr.send(formData);
    },
    [router],
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: MAX_BYTES,
    accept: ACCEPTED,
  });

  const rejectionMessage = fileRejections[0]?.errors[0]?.code === "file-too-large"
    ? `File is too large. Max ${MAX_BYTES / 1024 / 1024} MB.`
    : fileRejections[0]?.errors[0]?.message;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Upload a document</h1>
        <p className="text-sm text-muted-foreground">
          We support PDF, DOCX, and TXT files up to {MAX_BYTES / 1024 / 1024} MB.
        </p>
      </header>

      <DisclaimerBanner />

      <Card>
        <CardHeader>
          <CardTitle>Choose a file</CardTitle>
          <CardDescription>
            Your file is processed locally on the server. Only you can see your documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps({
              className:
                "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-12 text-center cursor-pointer transition-colors hover:border-primary hover:bg-muted/50",
            })}
            role="button"
            tabIndex={0}
            aria-label="Upload file"
          >
            <input {...getInputProps()} aria-label="File input" />
            {isDragActive ? (
              <>
                <UploadIcon className="size-8 text-primary" aria-hidden="true" />
                <p className="font-medium">Drop the file here</p>
              </>
            ) : (
              <>
                <FileText className="size-8 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium">Drag &amp; drop a file here</p>
                  <p className="text-xs text-muted-foreground">or click to browse</p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  PDF, DOCX, TXT — up to {MAX_BYTES / 1024 / 1024} MB
                </p>
              </>
            )}
          </div>

          {rejectionMessage ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4" aria-hidden="true" />
              <p>{rejectionMessage}</p>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4" aria-hidden="true" />
              <p>{error}</p>
            </div>
          ) : null}

          {progress !== null ? (
            <div className="mt-6 space-y-2" aria-live="polite">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {progress === 100 ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircle2 className="size-3" aria-hidden="true" />
                  Processing…
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" asChild>
          <a href="/dashboard">Cancel</a>
        </Button>
      </div>
    </div>
  );
}
