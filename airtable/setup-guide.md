# Airtable Setup Guide

This guide turns the schema in [base-schema.json](/Users/user/Documents/Coding/ResearchAgent/airtable/base-schema.json) into a working Airtable base.

## 1. Create Tables

Create these tables in this order so linked records are easy to wire up:

1. `Profiles`
2. `Search Runs`
3. `Findings`
4. `Opportunities`
5. `Lab Details`
6. `Startup Details`
7. `Contacts`
8. `Drafts`
9. `Outreach Events`

If you prefer CSV-first setup, import the matching template from `templates/` for each table and then adjust field types.

## 2. Configure the Core Workflow

Use the workflow below as the system default:

1. Create or select an active `Profiles` row for your current resume and interests.
2. Every research batch creates a `Search Runs` row.
3. Every raw result lands in `Findings`.
4. Only qualified items become `Opportunities`.
5. `Lab Details` and `Startup Details` hold type-specific enrichment.
6. `Contacts` stores one or more real people per opportunity.
7. `Drafts` stores generated emails by version.
8. `Outreach Events` is the timeline for every send, follow-up, and reply.
9. `Findings.Structured Data` stores normalized research output used during qualification.
10. `Findings.Source` should be plain text because it stores source labels like a lab name, domain, or source page title, not a fixed enum.

## 3. Required Views

Create these views first:

### Findings

- `New Findings`: filter where `Decision` is blank or `new`

### Opportunities

- `Labs to Review`: `Target Type = Lab` and `Stage` is one of `Discovered`, `Researching`, `Qualified`
- `Startups to Review`: `Target Type = Startup` and `Stage` is one of `Discovered`, `Researching`, `Qualified`
- `Sent / Awaiting Reply`: `Stage` is `Sent` or `Follow-Up Due`
- `Positive Replies`: `Stage = Replied Positive`
- `Closed / Not a Fit`: `Outcome = Closed`

### Drafts

- `Draft Ready`: `Status` is `Needs Review` or `Ready`

## 4. Recommended Automations

### Finding accepted creates opportunity

- Trigger: when `Findings.Decision` changes to `keep`
- Action: create an `Opportunities` row if one does not exist, or link the finding to an existing opportunity

### Draft creation readiness

- Trigger: when an `Opportunities` row has `Profile`, `Primary Contact`, and `Stage = Qualified`
- Action: create a `Drafts` row with `Status = draft`

### Send event updates stage

- Trigger: when `Outreach Events.Event Type = Sent`
- Action: update linked `Opportunities.Stage` to `Sent`
- Action: set `Opportunities.Next Follow-Up Date` to 7 days after `Event Date` unless already set

### Reply event updates status

- Trigger: when `Outreach Events.Event Type = Reply Received`
- Action: update linked `Opportunities.Stage` based on sentiment
- Action: update `Outcome` and `Contacts.Response Sentiment`

### Daily follow-up queue

- Trigger: scheduled daily
- Action: flag records where `Next Follow-Up Date <= TODAY()` and no reply has been logged

## 5. Formula and Rollup Recommendations

These fields are marked as computed in the schema and should be implemented as rollups or lookups rather than editable fields.

### Opportunities

- `Last Activity Date`
  - Roll up `Outreach Events -> Event Date`
  - Aggregation: latest date

### Contacts

- `Last Contacted`
  - Roll up `Outreach Events -> Event Date`
  - Restrict to event types `Sent` and `Follow-Up Sent`

- `Last Reply Date`
  - Roll up `Outreach Events -> Event Date`
  - Restrict to event type `Reply Received`

If you want a formula field for overdue follow-ups on `Opportunities`, add:

```text
IF(
  AND(
    {Outcome} = "Open",
    {Next Follow-Up Date},
    {Next Follow-Up Date} <= TODAY(),
    OR({Stage} = "sent", {Stage} = "follow_up_due")
  ),
  "due",
  BLANK()
)
```

## 6. Deduplication Rules

Use these keys when your research agent inserts or merges records:

- Labs: `University + Professor/PI + Opportunity Name`
- Startups: company domain first, `Crunchbase URL` second

Keep all duplicates in `Findings`, but merge into a single `Opportunities` row.

## 7. Practical Defaults

- Default follow-up cadence: 7 days
- One `Opportunities` record per lab or startup
- Multiple `Contacts` per opportunity
- Drafts stay manual-send
- Keep every search run and every raw finding for provenance

## 8. Suggested First Records

Create these rows first so the base becomes usable immediately:

1. One active `Profiles` row with your UC Davis background, majors, skills, and current interests
2. One `Search Runs` row for a UC Davis lab search
3. One `Search Runs` row for a startup funding/hiring search
4. A few `Findings` rows linked to those runs
5. At least one qualified `Opportunities` row of each type
