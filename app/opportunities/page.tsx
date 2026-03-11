import Link from "next/link";
import { ConfigBanner } from "@/components/config-banner";
import { FlashBanner } from "@/components/flash-banner";
import { getConfigurationStatus } from "@/lib/env";
import { getDashboardData } from "@/lib/services/app-data";
import { formatDate } from "@/lib/utils";

export default async function OpportunitiesPage({
  searchParams
}: {
  searchParams: Promise<{
    status?: string;
    message?: string;
    search?: string;
    stage?: string;
    targetType?: string;
    priority?: string;
    sort?: string;
  }>;
}) {
  const data = await getDashboardData();
  const config = getConfigurationStatus();
  const params = await searchParams;
  const search = (params.search || "").toLowerCase();
  const stage = params.stage || "all";
  const targetType = params.targetType || "all";
  const priority = params.priority || "all";
  const sort = params.sort || "score_desc";
  const filteredOpportunities = data.opportunities
    .filter((opportunity) => {
      const matchesSearch =
        !search ||
        opportunity.name.toLowerCase().includes(search) ||
        opportunity.whyFit.toLowerCase().includes(search) ||
        opportunity.statusSummary.toLowerCase().includes(search);
      const matchesStage = stage === "all" || opportunity.stage === stage;
      const matchesType = targetType === "all" || opportunity.targetType === targetType;
      const matchesPriority = priority === "all" || opportunity.priority === priority;
      return matchesSearch && matchesStage && matchesType && matchesPriority;
    })
    .sort((a, b) => {
      if (sort === "score_asc") {
        return a.fitScore - b.fitScore;
      }
      if (sort === "name_asc") {
        return a.name.localeCompare(b.name);
      }
      if (sort === "follow_up_asc") {
        return (a.nextFollowUpDate || "9999").localeCompare(b.nextFollowUpDate || "9999");
      }
      return b.fitScore - a.fitScore;
    });

  return (
    <main className="page-shell stack">
      <section className="section-heading">
        <p className="eyebrow">Opportunities</p>
        <h1 className="page-title">Manage the qualified lab and startup targets worth outreach.</h1>
        <p className="muted">
          This is the working queue for contact creation, draft generation, and
          reply tracking.
        </p>
      </section>

      <ConfigBanner configured={config.airtable} openAiConfigured={config.openai} />
      <FlashBanner status={params.status} message={params.message} />

      <form method="get" className="filter-bar">
        <label>
          Search
          <input defaultValue={params.search || ""} name="search" placeholder="Search opportunities" />
        </label>
        <label>
          Stage
          <select defaultValue={stage} name="stage">
            <option value="all">all</option>
            {[
              "discovered",
              "researching",
              "qualified",
              "draft_ready",
              "sent",
              "follow_up_due",
              "replied_positive",
              "replied_neutral",
              "replied_negative",
              "closed"
            ].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select defaultValue={targetType} name="targetType">
            <option value="all">all</option>
            <option value="lab">lab</option>
            <option value="startup">startup</option>
          </select>
        </label>
        <label>
          Priority
          <select defaultValue={priority} name="priority">
            <option value="all">all</option>
            <option value="high">high</option>
            <option value="medium">medium</option>
            <option value="low">low</option>
          </select>
        </label>
        <label>
          Sort
          <select defaultValue={sort} name="sort">
            <option value="score_desc">score desc</option>
            <option value="score_asc">score asc</option>
            <option value="name_asc">name asc</option>
            <option value="follow_up_asc">follow-up asc</option>
          </select>
        </label>
        <button type="submit">Apply filters</button>
      </form>

      <section className="list-stack">
        {filteredOpportunities.length === 0 ? (
          <section className="content-panel">
            <p className="muted">No opportunities yet. Qualify findings to create them.</p>
          </section>
        ) : (
          filteredOpportunities.map((opportunity) => (
            <Link className="content-panel link-panel" href={`/opportunities/${opportunity.id}`} key={opportunity.id}>
              <div className="list-card-top">
                <div>
                  <p className="eyebrow">{opportunity.targetType}</p>
                  <h2 className="panel-title">{opportunity.name}</h2>
                </div>
                <div className="pill-row">
                  <span className="pill">{opportunity.stage}</span>
                  <span className="pill">{opportunity.priority}</span>
                </div>
              </div>
              <p>{opportunity.whyFit || opportunity.statusSummary}</p>
              <p className="muted">
                Next follow-up: {formatDate(opportunity.nextFollowUpDate)} | Score{" "}
                {opportunity.fitScore || 0}
              </p>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
