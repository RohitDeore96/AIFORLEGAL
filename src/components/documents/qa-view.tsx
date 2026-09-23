"use client";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, AlertCircle, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { DisclaimerBanner } from "@/components/common/disclaimer-banner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { QaAnswer } from "@/types";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: { chunkId: string; snippet: string; page?: number | null; section?: string | null }[] | null;
  confidence?: QaAnswer["confidence"];
  followUpQuestions?: string[];
};

async function fetchHistory(docId: string): Promise<Message[]> {
  const res = await fetch(`/api/documents/${docId}/qa/history`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? "Failed to load history");
  return json.data;
}

async function askQuestion(docId: string, question: string): Promise<QaAnswer & { model?: string }> {
  const res = await fetch(`/api/documents/${docId}/qa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? "Failed to get answer");
  return json.data;
}

export function QaView({ docId }: { docId: string }) {
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: history, isLoading } = useQuery({
    queryKey: ["qa-history", docId],
    queryFn: () => fetchHistory(docId),
  });

  const ask = useMutation({
    mutationFn: (question: string) => askQuestion(docId, question),
    onMutate: async (question) => {
      // Optimistic: add user message
      const optimisticUser: Message = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: question,
      };
      const prev = qc.getQueryData<Message[]>(["qa-history", docId]) ?? [];
      qc.setQueryData<Message[]>(["qa-history", docId], [...prev, optimisticUser]);
      setInput("");
      return { prev };
    },
    onSuccess: (answer) => {
      const newMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: answer.answer,
        citations: answer.citations,
        confidence: answer.confidence,
        followUpQuestions: answer.followUpQuestions,
      };
      const prev = qc.getQueryData<Message[]>(["qa-history", docId]) ?? [];
      qc.setQueryData<Message[]>(["qa-history", docId], [...prev, newMsg]);
    },
    onError: (err: Error, _q, ctx) => {
      if (ctx?.prev) qc.setQueryData(["qa-history", docId], ctx.prev);
      toast.error(err.message);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || ask.isPending) return;
    ask.mutate(input.trim());
  }

  if (isLoading) return <LoadingSkeleton />;

  const messages = history ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Ask a question</h2>
        <p className="text-sm text-muted-foreground">
          Answers are grounded in your document. If the document doesn&apos;t say it, the AI will say so.
        </p>
      </div>

      <DisclaimerBanner variant="compact" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="size-4" aria-hidden="true" />
            Conversation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[420px] rounded-md border p-4">
            <div ref={scrollRef} className="space-y-4">
              {messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">
                  Ask your first question below. Try: &ldquo;What happens if I terminate this agreement?&rdquo;
                </p>
              ) : null}
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {ask.isPending ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="size-2 animate-pulse rounded-full bg-primary" />
                  <span>Thinking…</span>
                </div>
              ) : null}
            </div>
          </ScrollArea>

          <form onSubmit={handleSubmit} className="mt-4 space-y-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about this document…"
              rows={2}
              aria-label="Question"
              disabled={ask.isPending}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Press <kbd className="rounded border px-1">⌘</kbd>+
                <kbd className="rounded border px-1">↵</kbd> to send
              </p>
              <Button type="submit" disabled={!input.trim() || ask.isPending}>
                <Send className="size-4" aria-hidden="true" />
                Send
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        {!isUser && message.confidence ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={
                message.confidence === "insufficient"
                  ? "border-destructive text-destructive"
                  : message.confidence === "high"
                    ? "border-emerald-500 text-emerald-700 dark:text-emerald-400"
                    : ""
              }
            >
              Confidence: {message.confidence}
            </Badge>
          </div>
        ) : null}
        {!isUser && message.citations && message.citations.length > 0 ? (
          <div className="mt-2 space-y-1 border-t border-border/40 pt-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Sources
            </p>
            {message.citations.map((c, i) => (
              <div key={i} className="text-xs">
                <span className="text-muted-foreground">
                  {c.page ? `p.${c.page}` : ""}
                  {c.section ? ` • ${c.section}` : ""}
                </span>
                <p className="italic mt-0.5">&ldquo;{c.snippet}&rdquo;</p>
              </div>
            ))}
          </div>
        ) : null}
        {!isUser && message.followUpQuestions && message.followUpQuestions.length > 0 ? (
          <div className="mt-2 border-t border-border/40 pt-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Follow-up suggestions
            </p>
            <ul className="mt-1 space-y-1 text-xs">
              {message.followUpQuestions.map((q, i) => (
                <li key={i} className="text-muted-foreground">• {q}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
