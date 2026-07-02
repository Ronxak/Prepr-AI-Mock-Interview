import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getFullReport } from "@/services/report.service";
import { ReportView } from "@/components/report/report-view";

export const metadata: Metadata = { title: "Interview report" };

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const report = await getFullReport(id, user!.id).catch(() => null);

  if (!report) redirect("/history");

  return (
    <div className="mx-auto max-w-4xl">
      <ReportView report={report} />
    </div>
  );
}
