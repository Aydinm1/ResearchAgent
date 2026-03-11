import Link from "next/link";
import { ConfigBanner } from "@/components/config-banner";
import { getConfigurationStatus } from "@/lib/env";
import { getDashboardData } from "@/lib/services/app-data";

const shortcutItems = [
  {
    href: "/profiles",
    label: "Profiles",
    description: "Define the profile, voice, and constraints that should guide every run."
  },
  {
    href: "/search-runs",
    label: "Search Runs",
    description: "Launch new lab or startup discovery batches and review the raw output."
  },
  {
    href: "/findings",
    label: "Findings Queue",
    description: "Review fresh results fast and qualify only the strongest fits."
  },
  {
    href: "/opportunities",
    label: "Opportunities",
    description: "Track active targets, stage changes, and follow-up timing in one place."
  },
  {
    href: "/drafts",
    label: "Draft Review",
    description: "Refine generated outreach before you send it through your normal process."
  }
] as const;

function StatCard({
  label,
  value,
  helper
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <article className="stat-card">
      <p className="eyebrow">{label}</p>
      <h3>{value}</h3>
      <p className="muted">{helper}</p>
    </article>
  );
}

export default async function HomePage() {
  const data = await getDashboardData();
  const config = getConfigurationStatus();
  const pendingFindings = data.findings.filter(
    (finding) => finding.decision === "new" || !finding.decision
  ).length;
  const followUpsDue = data.opportunities.filter(
    (opportunity) => opportunity.stage === "follow_up_due"
  ).length;

  return (
    <main className="page-shell stack">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Operator Console</p>
          <h1>Run research, qualify targets, draft outreach, and track replies.</h1>
          <p className="hero-text">
            The app is now structured around the actual workflow rather than the
            schema alone. Airtable remains the source of truth, and OpenAI drives
            search-backed discovery plus email drafting when configured.
          </p>
          <div className="hero-tags" aria-label="Workflow stages">
            <span className="pill">Discovery</span>
            <span className="pill">Qualification</span>
            <span className="pill">Outreach</span>
          </div>
        </div>
        <div className="hero-panel">
          <p className="panel-label">Status</p>
          <p className="panel-value">{data.configured ? "Live" : "Setup"}</p>
          <p className="muted">
            Airtable is {config.airtable ? "connected" : "not configured"}.
            OpenAI is {config.openai ? "connected" : "not configured"}.
          </p>
          <dl className="hero-status-list">
            <div>
              <dt>Queued review</dt>
              <dd>{pendingFindings}</dd>
            </div>
            <div>
              <dt>Follow-ups due</dt>
              <dd>{followUpsDue}</dd>
            </div>
            <div>
              <dt>Active opportunities</dt>
              <dd>{data.opportunities.length}</dd>
            </div>
          </dl>
        </div>
      </section>

      <ConfigBanner configured={config.airtable} openAiConfigured={config.openai} />

      <section className="stats-grid">
        <StatCard
          label="Profiles"
          value={data.profiles.length}
          helper="Personalization snapshots used for research and email drafting."
        />
        <StatCard
          label="Search Runs"
          value={data.searchRuns.length}
          helper="On-demand lab and startup research batches."
        />
        <StatCard
          label="Pending Findings"
          value={pendingFindings}
          helper="Fresh results waiting for review and qualification."
        />
        <StatCard
          label="Follow-Ups Due"
          value={followUpsDue}
          helper="Opportunities currently waiting for your next touch."
        />
      </section>

      <section className="content-grid">
        <article className="content-panel">
          <div className="section-heading">
            <p className="eyebrow">Pipeline</p>
            <h2>Current counts</h2>
            <p className="muted">
              Quick view of the outreach workflow backed by Airtable entities.
            </p>
          </div>
          <dl className="summary-list">
            <div>
              <dt>Opportunities</dt>
              <dd>{data.opportunities.length}</dd>
            </div>
            <div>
              <dt>Drafts</dt>
              <dd>{data.drafts.length}</dd>
            </div>
            <div>
              <dt>Outreach events</dt>
              <dd>{data.outreachEvents.length}</dd>
            </div>
            <div>
              <dt>Qualified labs</dt>
              <dd>
                {data.opportunities.filter((item) => item.targetType === "lab").length}
              </dd>
            </div>
          </dl>
        </article>

        <article className="content-panel">
          <div className="section-heading">
            <p className="eyebrow">Runbook</p>
            <h2>Recommended operating sequence</h2>
            <p className="muted">
              Start with a strong profile, then move through discovery, qualification,
              drafting, and reply tracking.
            </p>
          </div>
          <ol className="flow-list">
            <li>Create or update your active profile.</li>
            <li>Run lab and startup research from the search runs page.</li>
            <li>Review findings and qualify only strong-fit targets.</li>
            <li>Add a contact, generate a draft, then send manually.</li>
            <li>Log replies and keep the follow-up queue clean.</li>
          </ol>
        </article>
      </section>

      <section className="content-panel">
        <div className="section-heading">
          <p className="eyebrow">Shortcuts</p>
          <h2>Move through the workflow</h2>
          <p className="muted">These pages are the real entry points for v1.</p>
        </div>
        <div className="shortcut-grid">
          {shortcutItems.map((item) => (
            <Link className="shortcut-card" href={item.href} key={item.href}>
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
