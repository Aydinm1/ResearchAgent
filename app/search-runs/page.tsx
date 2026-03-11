import Link from "next/link";
import { ConfigBanner } from "@/components/config-banner";
import { FlashBanner } from "@/components/flash-banner";
import { getConfigurationStatus } from "@/lib/env";
import { getDashboardData } from "@/lib/services/app-data";
import { formatDate } from "@/lib/utils";

export default async function SearchRunsPage({
  searchParams
}: {
  searchParams: Promise<{
    status?: string;
    message?: string;
    search?: string;
    targetType?: string;
  }>;
}) {
  const data = await getDashboardData();
  const config = getConfigurationStatus();
  const params = await searchParams;
  const search = (params.search || "").toLowerCase();
  const targetType = params.targetType || "all";
  const filteredRuns = data.searchRuns.filter((run) => {
    const matchesSearch =
      !search ||
      run.runName.toLowerCase().includes(search) ||
      run.queryText.toLowerCase().includes(search);
    const matchesType = targetType === "all" || run.targetType === targetType;
    return matchesSearch && matchesType;
  });

  return (
    <main className="page-shell stack">
      <section className="section-heading">
        <p className="eyebrow">Search Runs</p>
        <h1 className="page-title">Launch new research runs and review previous batches.</h1>
        <p className="muted">
          v1 runs on demand. Each run creates a search record, calls the provider,
          and stores raw findings for later review.
        </p>
      </section>

      <ConfigBanner configured={config.airtable} openAiConfigured={config.openai} />
      <FlashBanner status={params.status} message={params.message} />

      <section className="content-grid">
        <article className="content-panel">
          <h2 className="panel-title">Run lab research</h2>
          <form action="/api/research/labs?redirectTo=/findings" method="post" className="form-grid">
            <label>
              Profile
              <select name="profileId" required defaultValue="">
                <option disabled value="">
                  Select a profile
                </option>
                {data.profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.profileName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Query
              <textarea
                name="queryText"
                rows={4}
                defaultValue="Find UC Davis labs and professors aligned with cognitive science, AI, HCI, and computer science."
              />
            </label>
            <label>
              Filters
              <input name="filtersUsed" placeholder="e.g. undergrad-friendly, computational cognition" />
            </label>
            <label>
              Max results
              <input name="maxResults" type="number" min="1" max="12" defaultValue="6" />
            </label>
            <button disabled={!config.airtable || !config.openai} type="submit">
              Run lab search
            </button>
          </form>
        </article>

        <article className="content-panel">
          <h2 className="panel-title">Run startup research</h2>
          <form
            action="/api/research/startups?redirectTo=/findings"
            method="post"
            className="form-grid"
          >
            <label>
              Profile
              <select name="profileId" required defaultValue="">
                <option disabled value="">
                  Select a profile
                </option>
                {data.profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.profileName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Query
              <textarea
                name="queryText"
                rows={4}
                defaultValue="Find funded startups relevant to AI, developer tools, cognition, HCI, or research software that are hiring or likely to hire."
              />
            </label>
            <label>
              Filters
              <input name="filtersUsed" placeholder="e.g. seed to series A, remote-friendly" />
            </label>
            <label>
              Max results
              <input name="maxResults" type="number" min="1" max="12" defaultValue="6" />
            </label>
            <button disabled={!config.airtable || !config.openai} type="submit">
              Run startup search
            </button>
          </form>
        </article>
      </section>

      <section className="content-panel">
        <form method="get" className="filter-bar">
          <label>
            Search
            <input
              defaultValue={params.search || ""}
              name="search"
              placeholder="Search runs"
            />
          </label>
          <label>
            Target type
            <select defaultValue={targetType} name="targetType">
              <option value="all">all</option>
              <option value="lab">lab</option>
              <option value="startup">startup</option>
            </select>
          </label>
          <button type="submit">Apply filters</button>
        </form>
        <h2 className="panel-title">Previous runs</h2>
        <div className="list-stack">
          {filteredRuns.length === 0 ? (
            <p className="muted">No search runs recorded yet.</p>
          ) : (
            filteredRuns.map((run) => (
              <Link className="list-card link-panel" href={`/search-runs/${run.id}`} key={run.id}>
                <div className="list-card-top">
                  <h3>{run.runName}</h3>
                  <span className="pill">{run.status}</span>
                </div>
                <p className="muted">
                  {run.targetType} via {run.source} on {formatDate(run.runDate)}
                </p>
                <p>{run.queryText}</p>
                <p className="muted">
                  Results: {run.resultCount} imported: {run.importedCount}
                </p>
              </Link>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
