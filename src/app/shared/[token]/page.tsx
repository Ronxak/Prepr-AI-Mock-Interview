import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSharedReport } from "@/services/report.service";
import { ReportView } from "@/components/report/report-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Shared interview report",
  robots: { index: false, follow: false },
};

/**
 * Public, read-only report view reachable via a share token. Lives OUTSIDE the
 * (app) route group so it is not behind the authenticated layout/guard — anyone
 * with the link can view it.
 */
export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const report = await getSharedReport(token).catch(() => null);

  if (!report) notFound();

  return (
    <main className="min-h-dvh">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-5 backdrop-blur-xl print:hidden">
        <Logo />
        <Button asChild size="sm">
          <Link href="/signup">Try it yourself</Link>
        </Button>
      </header>
      <div className="mx-auto max-w-4xl space-y-6 px-5 py-8">
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 print:hidden">
          <Badge>Shared report</Badge>
          <span className="text-sm text-muted-foreground">
            You&apos;re viewing a public, read-only interview report. Sign up to
            create your own.
          </span>
        </div>
        <ReportView report={report} isShared />
      </div>
    </main>
  );
}
