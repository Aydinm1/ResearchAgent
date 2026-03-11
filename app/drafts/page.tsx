import Link from "next/link";
import { ConfigBanner } from "@/components/config-banner";
import { FlashBanner } from "@/components/flash-banner";
import { getConfigurationStatus } from "@/lib/env";
import { getDashboardData } from "@/lib/services/app-data";
import { formatDate } from "@/lib/utils";

export default async function DraftsPage({
  searchParams
}: {
  searchParams: Promise<{
    status?: string;
    message?: string;
    search?: string;
    draftType?: string;
    draftStatus?: string;
  }>;
}) {
  const data = await getDashboardData();
  const config = getConfigurationStatus();
  const params = await searchParams;
  const search = (params.search || "").toLowerCase();
  const draftType = params.draftType || "all";
  const draftStatus = params.draftStatus || "all";
  const filteredDrafts = data.drafts.filter((draft) => {
    const opportunity = data.opportunities.find((item) =>
      draft.opportunityIds.includes(item.id)
    );
    const matchesSearch =
      !search ||
      draft.draftTitle.toLowerCase().includes(search) ||
      draft.subject.toLowerCase().includes(search) ||
      draft.body.toLowerCase().includes(search) ||
      opportunity?.name.toLowerCase().includes(search);
    const matchesType = draftType === "all" || draft.draftType === draftType;
    const matchesStatus = draftStatus === "all" || draft.status === draftStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <main className="page-shell stack">
      <section className="section-heading">
        <p className="eyebrow">Drafts</p>
        <h1 className="page-title">Review generated outreach before sending it manually.</h1>
        <p className="muted">
          Draft generation is tied to a specific opportunity, contact, and profile version.
        </p>
      </section>

      <ConfigBanner configured={config.airtable} openAiConfigured={config.openai} />
      <FlashBanner status={params.status} message={params.message} />

      <form method="get" className="filter-bar">
        <label>
          Search
          <input defaultValue={params.search || ""} name="search" placeholder="Search drafts" />
        </label>
        <label>
          Draft type
          <select defaultValue={draftType} name="draftType">
            <option value="all">all</option>
            <option value="initial">initial</option>
            <option value="follow_up">follow_up</option>
            <option value="reply">reply</option>
          </select>
        </label>
        <label>
          Status
          <select defaultValue={draftStatus} name="draftStatus">
            <option value="all">all</option>
            <option value="draft">draft</option>
            <option value="needs_review">needs_review</option>
            <option value="ready">ready</option>
            <option value="sent">sent</option>
            <option value="obsolete">obsolete</option>
          </select>
        </label>
        <button type="submit">Apply filters</button>
      </form>

      <section className="list-stack">
        {filteredDrafts.length === 0 ? (
          <section className="content-panel">
            <p className="muted">No drafts generated yet.</p>
          </section>
        ) : (
          filteredDrafts.map((draft) => {
            const opportunity = data.opportunities.find((item) =>
              draft.opportunityIds.includes(item.id)
            );
            return (
              <article className="content-panel" key={draft.id}>
                <div className="list-card-top">
                  <div>
                    <p className="eyebrow">{draft.draftType}</p>
                    <h2 className="panel-title">{draft.draftTitle}</h2>
                  </div>
                  <span className="pill">{draft.status}</span>
                </div>
                <p className="muted">
                  {opportunity ? (
                    <Link href={`/opportunities/${opportunity.id}`}>{opportunity.name}</Link>
                  ) : (
                    "Unlinked opportunity"
                  )}{" "}
                  | Generated {formatDate(draft.generatedAt)}
                </p>
                <p>
                  <strong>{draft.subject}</strong>
                </p>
                <pre className="draft-preview">{draft.body}</pre>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
