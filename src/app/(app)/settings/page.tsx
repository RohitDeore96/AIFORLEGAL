"use client";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DisclaimerBanner } from "@/components/common/disclaimer-banner";

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Settings &amp; privacy</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account and understand how your data is used.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            <span className="text-muted-foreground">Name:</span>{" "}
            <span className="font-medium">{session?.user?.name ?? "—"}</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Email:</span>{" "}
            <span className="font-medium">{session?.user?.email ?? "—"}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            All documents you upload are stored on the application server and associated with your account.
            No other user can access them.
          </p>
          <p>
            AI analyses are cached to avoid re-running them. Each cached result can be re-generated at any time by clicking the &ldquo;Re-run&rdquo; button on the relevant page.
          </p>
          <p>
            Document text is sent to the configured AI provider (Google Gemini by default) for analysis.
            It is not used by the provider for training.
          </p>
          <p className="text-muted-foreground">
            To permanently delete all your data, delete each document from your dashboard.
            Account deletion is a manual operation — contact the operator.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Disclaimer</CardTitle>
        </CardHeader>
        <CardContent>
          <DisclaimerBanner />
          <p className="mt-3 text-sm text-muted-foreground">
            By continuing to use this application, you acknowledge that the information provided is general legal information only and not legal advice.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
