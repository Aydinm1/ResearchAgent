import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfigBanner } from "@/components/config-banner";
import { FlashBanner } from "@/components/flash-banner";
import { getConfigurationStatus } from "@/lib/env";
import { getDashboardData } from "@/lib/services/app-data";
import { formatDate, parseJsonBlock } from "@/lib/utils";

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

      <section className="content-grid">
        <article className="content-panel">
          <h2 className="panel-title">Run metadata</h2>
          <dl className="summary-list">
            <div>
              <dt>Status</dt>
              <dd>{searchRun.status}</dd>
            </div>
            <div>
              <dt>Imported</dt>
              <dd>{searchRun.importedCount}</dd>
            </div>
          </dl>
          <p>
            <strong>Query:</strong> {searchRun.queryText || "Not provided"}
          </p>
          <p>
            <strong>Filters:</strong> {searchRun.filtersUsed || "None"}
          </p>
          <p>
            <strong>Notes:</strong> {searchRun.notes || "None"}
          </p>
        </article>

        <article className="content-panel">
          <h2 className="panel-title">Result provenance</h2>
          <p className="muted">
            Each finding below was created from this run and can be promoted into an opportunity.
          </p>
          <p>
            <Link href="/findings">Open findings queue</Link>
          </p>
        </article>
      </section>

      <section className="content-panel">
        <h2 className="panel-title">Findings from this run</h2>
        <div className="list-stack">
          {findings.length === 0 ? (
            <p className="muted">No findings linked to this run yet.</p>
          ) : (
            findings.map((finding) => {
              const structured = parseJsonBlock<{ detailSummary?: string }>(
                finding.structuredData,
                { detailSummary: "" }
              );
              return (
                <article className="list-card" key={finding.id}>
                  <div className="list-card-top">
                    <div>
                      <p className="eyebrow">{finding.targetType}</p>
                      <h3>{finding.candidateName || finding.title}</h3>
                    </div>
                    <span className="pill">{finding.decision || "new"}</span>
                  </div>
                  <p className="muted">{finding.url}</p>
                  <p>{finding.snippet}</p>
                  {structured.detailSummary ? (
                    <p className="muted">{structured.detailSummary}</p>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
