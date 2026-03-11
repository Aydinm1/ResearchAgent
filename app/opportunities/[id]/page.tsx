import { notFound } from "next/navigation";
import { ConfigBanner } from "@/components/config-banner";
import { FlashBanner } from "@/components/flash-banner";
import {
  listContacts,
  listDrafts,
  listOutreachEvents
} from "@/lib/airtable/repositories";
import { getConfigurationStatus, hasAirtableConfig } from "@/lib/env";
import { getDashboardData } from "@/lib/services/app-data";
import { formatDate } from "@/lib/utils";

export default async function OpportunityDetailPage({
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
  const opportunity = data.opportunities.find((item) => item.id === id);

  if (!opportunity) {
    notFound();
  }

  const [allContacts, allDrafts, allEvents] = hasAirtableConfig()
    ? await Promise.all([listContacts(), listDrafts(), listOutreachEvents()])
    : [[], [], []];

  const opportunityContacts = allContacts.filter((contact) =>
    contact.opportunityIds.includes(opportunity.id)
  );
  const opportunityDrafts = allDrafts.filter((draft) =>
    draft.opportunityIds.includes(opportunity.id)
  );
  const opportunityEvents = allEvents.filter((event) =>
    event.opportunityIds.includes(opportunity.id)
  );
  const profile = data.profiles.find((item) => opportunity.profileIds.includes(item.id));

  return (
    <main className="page-shell stack">
      <section className="section-heading">
        <p className="eyebrow">{opportunity.targetType}</p>
        <h1 className="page-title">{opportunity.name}</h1>
        <p className="muted">{opportunity.whyFit || opportunity.statusSummary}</p>
      </section>

      <ConfigBanner configured={config.airtable} openAiConfigured={config.openai} />
      <FlashBanner status={pageParams.status} message={pageParams.message} />

      <section className="content-grid">
        <article className="content-panel">
          <h2 className="panel-title">Opportunity status</h2>
          <form
            action={`/api/opportunities/${opportunity.id}?redirectTo=/opportunities/${opportunity.id}`}
            method="post"
            className="form-grid"
          >
            <label>
              Stage
              <select name="stage" defaultValue={opportunity.stage}>
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
                ].map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select name="priority" defaultValue={opportunity.priority}>
                {["high", "medium", "low"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Next action
              <input name="nextAction" defaultValue={opportunity.nextAction} />
            </label>
            <label>
              Next follow-up date
              <input
                name="nextFollowUpDate"
                type="date"
                defaultValue={opportunity.nextFollowUpDate.slice(0, 10)}
              />
            </label>
            <label>
              Outcome
              <select name="outcome" defaultValue={opportunity.outcome || "open"}>
                <option value="open">open</option>
                <option value="closed">closed</option>
              </select>
            </label>
            <button disabled={!config.airtable} type="submit">
              Update opportunity
            </button>
          </form>
        </article>

        <article className="content-panel">
          <h2 className="panel-title">Add contact</h2>
          <form
            action={`/api/contacts?redirectTo=/opportunities/${opportunity.id}`}
            method="post"
            className="form-grid"
          >
            <input name="opportunityId" type="hidden" value={opportunity.id} />
            <label>
              Full name
              <input name="fullName" required />
            </label>
            <label>
              Role
              <input name="role" />
            </label>
            <label>
              Organization / lab
              <input name="organizationLab" defaultValue={opportunity.name} />
            </label>
            <label>
              Email
              <input name="email" type="email" />
            </label>
            <label>
              LinkedIn
              <input name="linkedIn" />
            </label>
            <label>
              Contact type
              <select name="contactType" defaultValue="">
                <option value="">Select</option>
                {[
                  "professor",
                  "pi",
                  "postdoc",
                  "graduate_student",
                  "founder",
                  "recruiter",
                  "team_member"
                ].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-label">
              <input name="primary" type="checkbox" />
              Set as primary contact
            </label>
            <button disabled={!config.airtable} type="submit">
              Add contact
            </button>
          </form>
        </article>
      </section>

      <section className="content-grid">
        <article className="content-panel">
          <h2 className="panel-title">Generate draft</h2>
          <form
            action={`/api/drafts?redirectTo=/opportunities/${opportunity.id}`}
            method="post"
            className="form-grid"
          >
            <input name="opportunityId" type="hidden" value={opportunity.id} />
            <label>
              Profile
              <select name="profileId" defaultValue={profile?.id || ""} required>
                <option value="" disabled>
                  Select a profile
                </option>
                {data.profiles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.profileName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Contact
              <select
                name="contactId"
                required
                defaultValue={opportunityContacts[0]?.id || ""}
              >
                {opportunityContacts.length === 0 ? (
                  <option value="">Add a contact first</option>
                ) : (
                  opportunityContacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.fullName}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label>
              Draft type
              <select name="draftType" defaultValue="initial">
                <option value="initial">initial</option>
                <option value="follow_up">follow_up</option>
                <option value="reply">reply</option>
              </select>
            </label>
            <button
              disabled={!config.airtable || !config.openai || opportunityContacts.length === 0}
              type="submit"
            >
              Generate draft
            </button>
          </form>
        </article>

        <article className="content-panel">
          <h2 className="panel-title">Log outreach event</h2>
          <form
            action={`/api/outreach-events?redirectTo=/opportunities/${opportunity.id}`}
            method="post"
            className="form-grid"
          >
            <input name="opportunityId" type="hidden" value={opportunity.id} />
            <label>
              Contact
              <select name="contactId" defaultValue={opportunityContacts[0]?.id || ""}>
                <option value="">No contact</option>
                {opportunityContacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Draft
              <select name="draftId" defaultValue={opportunityDrafts[0]?.id || ""}>
                <option value="">No draft</option>
                {opportunityDrafts.map((draft) => (
                  <option key={draft.id} value={draft.id}>
                    {draft.draftTitle}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Event type
              <select name="eventType" defaultValue="sent">
                {[
                  "draft_created",
                  "sent",
                  "follow_up_sent",
                  "reply_received",
                  "meeting_requested",
                  "rejected",
                  "no_response_closed",
                  "note"
                ].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Event date
              <input name="eventDate" type="datetime-local" />
            </label>
            <label>
              Channel
              <select name="channel" defaultValue="email">
                <option value="email">email</option>
                <option value="linkedin">linkedin</option>
                <option value="manual_note">manual_note</option>
              </select>
            </label>
            <label>
              Summary
              <textarea name="summary" rows={3} />
            </label>
            <label>
              Raw reply
              <textarea name="rawReply" rows={3} />
            </label>
            <label>
              Outcome change
              <input name="outcomeChange" />
            </label>
            <label>
              Next follow-up date
              <input name="nextFollowUpDate" type="date" />
            </label>
            <button disabled={!config.airtable} type="submit">
              Save event
            </button>
          </form>
        </article>
      </section>

      <section className="content-grid">
        <article className="content-panel">
          <h2 className="panel-title">Contacts</h2>
          <div className="list-stack">
            {opportunityContacts.length === 0 ? (
              <p className="muted">No contacts added yet.</p>
            ) : (
              opportunityContacts.map((contact) => (
                <article className="list-card" key={contact.id}>
                  <div className="list-card-top">
                    <h3>{contact.fullName}</h3>
                    {contact.primary ? <span className="pill">Primary</span> : null}
                  </div>
                  <p>{contact.role}</p>
                  <p className="muted">{contact.email || "No email"}</p>
                </article>
              ))
            )}
          </div>
        </article>

        <article className="content-panel">
          <h2 className="panel-title">Drafts</h2>
          <div className="list-stack">
            {opportunityDrafts.length === 0 ? (
              <p className="muted">No drafts generated yet.</p>
            ) : (
              opportunityDrafts.map((draft) => (
                <article className="list-card" key={draft.id}>
                  <div className="list-card-top">
                    <h3>{draft.draftTitle}</h3>
                    <span className="pill">{draft.status}</span>
                  </div>
                  <p className="muted">{draft.subject}</p>
                  <pre className="draft-preview">{draft.body}</pre>
                </article>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="content-panel">
        <h2 className="panel-title">Outreach timeline</h2>
        <div className="list-stack">
          {opportunityEvents.length === 0 ? (
            <p className="muted">No outreach history yet.</p>
          ) : (
            opportunityEvents.map((event) => (
              <article className="list-card" key={event.id}>
                <div className="list-card-top">
                  <h3>{event.eventType}</h3>
                  <span className="pill">{formatDate(event.eventDate)}</span>
                </div>
                <p>{event.summary || event.rawReply || "No summary provided."}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
