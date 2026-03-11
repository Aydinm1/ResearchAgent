import Link from "next/link";
import { ConfigBanner } from "@/components/config-banner";
import { FlashBanner } from "@/components/flash-banner";
import { getConfigurationStatus } from "@/lib/env";
import { getDashboardData } from "@/lib/services/app-data";
import { formatDate, parseJsonBlock } from "@/lib/utils";

export default async function FindingsPage({
  searchParams
}: {
  searchParams: Promise<{
    status?: string;
    message?: string;
    search?: string;
    targetType?: string;
    decision?: string;
  }>;
}) {
  const data = await getDashboardData();
  const config = getConfigurationStatus();
  const activeProfile = data.profiles.find((profile) => profile.active) || data.profiles[0];
  const params = await searchParams;
  const search = (params.search || "").toLowerCase();
  const targetType = params.targetType || "all";
  const decision = params.decision || "all";
  const filteredFindings = data.findings.filter((finding) => {
    const matchesSearch =
      !search ||
      finding.title.toLowerCase().includes(search) ||
      finding.candidateName.toLowerCase().includes(search) ||
      finding.snippet.toLowerCase().includes(search);
    const matchesType = targetType === "all" || finding.targetType === targetType;
    const findingDecision = finding.decision || "new";
    const matchesDecision = decision === "all" || findingDecision === decision;
    return matchesSearch && matchesType && matchesDecision;
  });

  return (
    <main className="page-shell stack">
      <section className="section-heading">
        <p className="eyebrow">Findings</p>
        <h1 className="page-title">Review raw results before promoting them into opportunities.</h1>
        <p className="muted">
          Every finding preserves provenance. Only qualify the targets you would
          genuinely consider emailing.
        </p>
      </section>

      <ConfigBanner configured={config.airtable} openAiConfigured={config.openai} />
      <FlashBanner status={params.status} message={params.message} />

      <form method="get" className="filter-bar">
        <label>
          Search
          <input defaultValue={params.search || ""} name="search" placeholder="Search findings" />
        </label>
        <label>
          Target type
          <select defaultValue={targetType} name="targetType">
            <option value="all">all</option>
            <option value="lab">lab</option>
            <option value="startup">startup</option>
          </select>
        </label>
        <label>
          Decision
          <select defaultValue={decision} name="decision">
            <option value="all">all</option>
            <option value="new">new</option>
            <option value="keep">keep</option>
            <option value="duplicate">duplicate</option>
            <option value="discard">discard</option>
          </select>
        </label>
        <button type="submit">Apply filters</button>
      </form>

      <section className="list-stack">
        {filteredFindings.length === 0 ? (
          <section className="content-panel">
            <p className="muted">No findings yet. Run a lab or startup search first.</p>
          </section>
        ) : (
          filteredFindings.map((finding) => {
            const structured = parseJsonBlock<{
              detailSummary?: string;
              metadata?: Record<string, unknown>;
            }>(finding.structuredData, { detailSummary: "", metadata: {} });
            const relatedRuns = data.searchRuns.filter((run) =>
              finding.searchRunIds.includes(run.id)
            );

            return (
              <article className="content-panel" key={finding.id}>
                <div className="list-card-top">
                  <div>
                    <p className="eyebrow">{finding.targetType}</p>
                    <h2 className="panel-title">{finding.candidateName || finding.title}</h2>
                  </div>
                  <span className="pill">{finding.decision || "new"}</span>
                </div>
                <p className="muted">{finding.url}</p>
                <p>{finding.snippet}</p>
                {structured.detailSummary ? (
                  <p className="muted">{structured.detailSummary}</p>
                ) : null}
                <p className="muted">
                  Tags: {finding.categoryTags.join(", ") || "None"} | Verified{" "}
                  {formatDate(finding.lastVerified)}
                </p>
                {relatedRuns.length > 0 ? (
                  <p className="muted">
                    Search run:{" "}
                    {relatedRuns.map((run, index) => (
                      <span key={run.id}>
                        {index > 0 ? ", " : ""}
                        <Link href={`/search-runs/${run.id}`}>{run.runName}</Link>
                      </span>
                    ))}
                  </p>
                ) : null}
                <form
                  action={`/api/findings/${finding.id}/qualify?redirectTo=/findings`}
                  method="post"
                  className="inline-form"
                >
                  <input name="findingId" type="hidden" value={finding.id} />
                  <input
                    name="profileId"
                    type="hidden"
                    value={activeProfile?.id || ""}
                  />
                  <label>
                    Fit score
                    <input name="fitScore" type="number" min="0" max="100" defaultValue="80" />
                  </label>
                  <label>
                    Priority
                    <select name="priority" defaultValue="medium">
                      <option value="high">high</option>
                      <option value="medium">medium</option>
                      <option value="low">low</option>
                    </select>
                  </label>
                  <button disabled={!config.airtable} type="submit">
                    Qualify
                  </button>
                </form>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
