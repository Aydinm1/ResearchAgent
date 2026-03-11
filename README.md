# Research Outreach App

This is a Next.js app for running lab and startup outreach workflows against an Airtable base.

## What exists now

- Airtable-first data model and schema definition
- Next.js App Router UI for:
  - profiles
  - search runs
  - findings review
  - opportunities
  - draft review
- API routes for Airtable-backed CRUD and workflow steps
- OpenAI-backed research runs for labs and startups
- OpenAI-backed draft generation for outreach emails
- Manual outreach event logging and stage tracking

## Required environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

- `AIRTABLE_BASE_ID`
- `AIRTABLE_TOKEN`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` optional, defaults to `gpt-5-mini`
- `RESEARCH_APP_OWNER` optional

## Development

```bash
npm install
npm run dev
```

## Production checks

```bash
npm run lint
npm run build
```

## Key paths

- [app/page.tsx](/Users/user/Documents/Coding/ResearchAgent/app/page.tsx)
- [app/search-runs/page.tsx](/Users/user/Documents/Coding/ResearchAgent/app/search-runs/page.tsx)
- [app/findings/page.tsx](/Users/user/Documents/Coding/ResearchAgent/app/findings/page.tsx)
- [app/opportunities/[id]/page.tsx](/Users/user/Documents/Coding/ResearchAgent/app/opportunities/[id]/page.tsx)
- [lib/airtable/repositories.ts](/Users/user/Documents/Coding/ResearchAgent/lib/airtable/repositories.ts)
- [lib/services/research.ts](/Users/user/Documents/Coding/ResearchAgent/lib/services/research.ts)
- [lib/services/drafts.ts](/Users/user/Documents/Coding/ResearchAgent/lib/services/drafts.ts)
- [airtable/base-schema.json](/Users/user/Documents/Coding/ResearchAgent/airtable/base-schema.json)

## Current workflow

1. Create a profile.
2. Run a lab or startup search.
3. Review and qualify findings.
4. Add a contact to an opportunity.
5. Generate a draft.
6. Send manually.
7. Log the event and any reply.

## Remaining work

The app is usable as a single-user v1, but the remaining backlog is tracked in [todos.md](/Users/user/Documents/Coding/ResearchAgent/todos.md).
