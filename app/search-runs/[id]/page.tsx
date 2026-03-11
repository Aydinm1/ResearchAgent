import { notFound } from "next/navigation";
import { ConfigBanner } from "@/components/config-banner";
import { FlashBanner } from "@/components/flash-banner";
import { SearchRunDetailClient } from "@/components/search-run-detail-client";
import { getConfigurationStatus } from "@/lib/env";
import { getDashboardData } from "@/lib/services/app-data";
import { formatDate } from "@/lib/utils";

export default async function SearchRunDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; message?: string }>;
}) {
  const { id } = await params;
  const pageParams = await searchParams;
  const data = await getDashboardData();
  const config = getConfigurationStatus();
  const searchRun = data.searchRuns.find((item) => item.id === id);

  if (!searchRun) {
    notFound();
  }

  const findings = data.findings.filter((finding) => finding.searchRunIds.includes(searchRun.id));

  return (
    <main className="page-shell stack">
      <section className="section-heading">
        <p className="eyebrow">Search Run</p>
        <h1 className="page-title">{searchRun.runName}</h1>
        <p className="muted">
          {searchRun.targetType} via {searchRun.source} on {formatDate(searchRun.runDate)}
        </p>
      </section>

      <ConfigBanner configured={config.airtable} openAiConfigured={config.openai} />
      <FlashBanner status={pageParams.status} message={pageParams.message} />

      <SearchRunDetailClient initialFindings={findings} initialSearchRun={searchRun} />
    </main>
  );
}
