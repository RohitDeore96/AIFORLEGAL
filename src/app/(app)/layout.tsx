import { AppSidebar } from "@/components/layout/app-sidebar";
import { DisclaimerBanner } from "@/components/common/disclaimer-banner";

// All authenticated pages are dynamic — they depend on the user's session.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <DisclaimerBanner variant="compact" className="border-b border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/10 px-4 py-2" />
      <div className="flex flex-1">
        <AppSidebar />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
