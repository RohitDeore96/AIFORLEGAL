import Link from "next/link";
import {
  ShieldCheck,
  FileText,
  MessageSquare,
  GitCompare,
  ListChecks,
  Scale,
  Sparkles,
  Lock,
  Eye,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { DisclaimerBanner } from "@/components/common/disclaimer-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative isolate overflow-hidden">
          <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                <Sparkles className="size-3" aria-hidden="true" />
                Powered by retrieval-grounded Gemini AI
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-6xl">
                Understand every legal document,
                <span className="text-primary"> in plain language.</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground md:text-xl">
                Upload contracts, agreements, or policies. Get summaries, identify
                important clauses, ask grounded questions, compare versions, and prepare
                for meetings with a qualified legal professional.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/sign-up">
                    Get started free
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/sign-in">Sign in</Link>
                </Button>
              </div>
              <div className="mt-8">
                <DisclaimerBanner variant="compact" className="justify-center" />
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t bg-muted/20">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Everything you need to navigate legal documents
              </h2>
              <p className="mt-4 text-muted-foreground">
                Built specifically for legal document intelligence — not a generic chatbot.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={FileText}
                title="Plain-language summaries"
                description="Get a structured overview: document type, parties, key obligations, important dates, payment provisions, and termination terms — explained in plain English."
              />
              <FeatureCard
                icon={Scale}
                title="Clause intelligence"
                description="Identifies termination, confidentiality, liability, indemnification, governing law, and 15+ other clause categories with plain-language explanations."
              />
              <FeatureCard
                icon={MessageSquare}
                title="Document-grounded Q&A"
                description="Ask any question about your document. Every answer cites the exact source location. If the document doesn't say it, the AI says so — no hallucination."
              />
              <FeatureCard
                icon={GitCompare}
                title="Document comparison"
                description="Compare two versions of a contract to see what was added, removed, or modified — with context on why each change matters."
              />
              <FeatureCard
                icon={ListChecks}
                title="Action checklist"
                description="Get a personalized, document-grounded action checklist so you know exactly what to review and what to ask a qualified legal professional."
              />
              <FeatureCard
                icon={ShieldCheck}
                title="Consultation prep"
                description="Generate a structured pack to bring to a lawyer: summary, key clauses, unclear provisions, missing information, and questions to ask."
              />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-t">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                From upload to insight in 4 steps
              </h2>
              <p className="mt-4 text-muted-foreground">
                No legal expertise required. Just upload, and the AI does the rest — grounded in your actual document.
              </p>
            </div>
            <ol className="mt-12 grid gap-6 md:grid-cols-4">
              {[
                { step: 1, title: "Upload", desc: "Drag-and-drop your PDF, DOCX, or TXT file. We validate, extract text, and chunk it for retrieval." },
                { step: 2, title: "Summarize", desc: "Get a structured overview with parties, dates, and key obligations in plain language." },
                { step: 3, title: "Explore", desc: "Browse identified clauses, ask grounded questions, generate checklists." },
                { step: 4, title: "Prepare", desc: "Export a consultation pack to bring to a qualified legal professional." },
              ].map((s) => (
                <li key={s.step}>
                  <Card className="h-full">
                    <CardHeader>
                      <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                        {s.step}
                      </div>
                      <CardTitle className="mt-2">{s.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{s.desc}</CardDescription>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Security */}
        <section id="security" className="border-t bg-muted/20">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Built with security &amp; trust at the core
              </h2>
              <p className="mt-4 text-muted-foreground">
                Legal documents are sensitive. We treat them that way.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <SecurityCard
                icon={Lock}
                title="User-isolated storage"
                description="Each user's documents are isolated. No user can ever access another user's documents — enforced at the database and middleware level."
              />
              <SecurityCard
                icon={Eye}
                title="Prompt-injection defense"
                description="Uploaded documents are treated strictly as data. Any instruction found inside a document is neutralized, never executed."
              />
              <SecurityCard
                icon={AlertTriangle}
                title="Hallucination prevention"
                description="Retrieval-grounded architecture. Every claim must cite a source chunk — or the AI says it can't answer. No fabricated clauses or citations."
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t">
          <div className="mx-auto max-w-4xl px-4 py-20 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Take control of your legal documents
            </h2>
            <p className="mt-4 text-muted-foreground">
              Get started in under a minute. No credit card required.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Button size="lg" asChild>
                <Link href="/sign-up">
                  Create free account
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <CardTitle className="mt-2">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="leading-relaxed">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

function SecurityCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-6">
      <div className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
