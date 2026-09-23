"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  FileText,
  ListTree,
  MessageSquare,
  ListChecks,
  Scale,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";

type DocMeta = {
  id: string;
  filename: string;
  originalName: string;
  wordCount: number | null;
  pageCount: number | null;
  language: string | null;
  status: string;
};

const TABS = [
  { segment: "summary", label: "Summary", icon: FileText },
  { segment: "clauses", label: "Clauses", icon: ListTree },
  { segment: "obligations", label: "Obligations", icon: CalendarClock },
  { segment: "qa", label: "Ask", icon: MessageSquare },
  { segment: "checklist", label: "Checklist", icon: ListChecks },
  { segment: "consultation", label: "Consult", icon: Scale },
];

export default function DocumentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const pathname = usePathname();
  const [doc, setDoc] = useState<DocMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [docId, setDocId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setDocId(p.id));
  }, [params]);

  useEffect(() => {
    if (!docId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/documents/${docId}`);
        const json = await res.json();
        if (!cancelled && json.ok) setDoc(json.data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [docId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
        <LoadingSkeleton />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Document not found.</p>
        <Link href="/dashboard" className="text-primary hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Back to documents
        </Link>
        <div className="space-y-1">
          <h1 className="truncate text-2xl font-bold tracking-tight" title={doc.originalName}>
            {doc.originalName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {doc.wordCount ?? 0} words
            {doc.pageCount ? ` • ${doc.pageCount} pages` : ""}
            {doc.language ? ` • ${doc.language.toUpperCase()}` : ""}
          </p>
        </div>
      </header>

      <nav
        aria-label="Document sections"
        className="flex flex-wrap gap-1 border-b"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const href = `/documents/${doc.id}/${tab.segment}`;
          const active = pathname.endsWith(`/${tab.segment}`);
          return (
            <Link
              key={tab.segment}
              href={href}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="size-4" aria-hidden="true" />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
