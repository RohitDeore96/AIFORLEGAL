import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function DisclaimerBanner({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "compact";
}) {
  if (variant === "compact") {
    return (
      <p
        className={cn(
          "text-xs text-muted-foreground italic",
          className,
        )}
      >
        AI-generated legal information — not legal advice. Consult a qualified professional for your situation.
      </p>
    );
  }
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-50 p-4 text-sm dark:bg-amber-950/20",
        className,
      )}
    >
      <AlertTriangle
        className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-500"
        aria-hidden="true"
      />
      <div className="space-y-1">
        <p className="font-medium text-amber-900 dark:text-amber-200">
          This is not legal advice
        </p>
        <p className="text-amber-800 dark:text-amber-300">
          LegalLens AI provides general legal information and document-grounded analysis.
          It is not a substitute for advice from a qualified legal professional licensed in your jurisdiction.
          Always consult a lawyer for your specific situation.
        </p>
      </div>
    </div>
  );
}
