# AI Agents

This document describes the AI-agent behavior that exists in the app today. It is implementation-focused and maps directly to the current code.

## Overview

The app has three AI-driven workflows:

1. Research agents for lab and startup discovery
2. AI review agents for fit scoring and qualification recommendations
3. Draft generation for outreach emails

These are not autonomous long-running worker processes or separate deployed services. They are server-side functions in the Next.js app that call OpenAI and persist results to Airtable.

## Current Architecture

The agent system is orchestrated from three service modules:

- [research.ts](/Users/user/Documents/Coding/ResearchAgent/lib/services/research.ts)
- [ai-review.ts](/Users/user/Documents/Coding/ResearchAgent/lib/services/ai-review.ts)
- [drafts.ts](/Users/user/Documents/Coding/ResearchAgent/lib/services/drafts.ts)

All model calls go through:

- [openai.ts](/Users/user/Documents/Coding/ResearchAgent/lib/openai.ts)

All persistence goes through:

- [repositories.ts](/Users/user/Documents/Coding/ResearchAgent/lib/airtable/repositories.ts)

## Research Agents

### What happens in a research run

A research run is a staged workflow, not one monolithic “agent”.

For labs and startups, the sequence is:

1. Load the selected profile
2. Run one discovery call to find candidate targets
3. Filter out candidates that already exist in Airtable
4. Run one enrichment call per remaining candidate
5. Save new findings to Airtable

The main entrypoints are:

- `startResearchRun(...)`
- `executeResearchRun(...)`
- `runResearch(...)`

in [research.ts](/Users/user/Documents/Coding/ResearchAgent/lib/services/research.ts).

### Discovery agent

The discovery agent is a single OpenAI call with web search enabled.

Its job is to return candidate rows with:

- `title`
- `url`
- `source`
- `snippet`
- `candidateName`

It does not produce the final Airtable finding shape by itself. It produces raw candidates that are then filtered and enriched.

Implementation:

- `buildDiscoveryPrompt(...)`
- `discoverCandidates(...)`

in [research.ts](/Users/user/Documents/Coding/ResearchAgent/lib/services/research.ts).

### Cross-run dedupe

Before enrichment starts, the app checks whether a discovered candidate already exists.

It compares against:

- existing `Findings`
- existing `Opportunities`

The current matching logic uses normalized:

- candidate name
- URL
- startup hostname

If a match is found, that candidate is skipped and no new enrichment call is made for it.

Implementation:

- `filterExistingCandidates(...)`

in [research.ts](/Users/user/Documents/Coding/ResearchAgent/lib/services/research.ts).

This is what prevents repeated “find 6 labs” runs from re-importing the same labs over and over.

### Enrichment agents

Each remaining candidate gets its own enrichment call.

That enrichment call fills in:

- `categoryTags`
- `location`
- `whyFit`
- `detailSummary`
- `metadata`

The metadata schema differs by target type:

Labs:

- `university`
- `department`
- `professor`
- `researchAreas`
- `methods`
- `currentProjects`
- `fundingSignal`
- `undergradFriendly`
- `applicationPath`

Startups:

- `companySite`
- `crunchbaseUrl`
- `industry`
- `businessModel`
- `fundingStage`
- `totalFunding`
- `latestRoundType`
- `latestRoundDate`
- `hiringSignal`
- `careersPage`
- `relevantRoles`
- `hq`
- `remote`
- `investors`

Implementation:

- `buildEnrichmentPrompt(...)`
- `enrichCandidate(...)`

in [research.ts](/Users/user/Documents/Coding/ResearchAgent/lib/services/research.ts).

### Concurrency model

Research enrichment is parallelized with bounded concurrency.

Today the limit is:

- `3` concurrent enrichment tasks

This means:

- one discovery call runs first
- then up to three candidate enrichments run at the same time
- when one finishes, the next candidate starts

Implementation:

- `runWithConcurrency(..., 3, ...)`

in [research.ts](/Users/user/Documents/Coding/ResearchAgent/lib/services/research.ts).

This is concurrency inside one Node server process. It is not spinning up multiple app instances or separate worker containers.

### Progress streaming

Research runs emit live progress through server-sent events.

The UI subscribes to those updates instead of polling. Progress is also persisted into `Search Runs.Notes`.

Relevant files:

- [search-run-events.ts](/Users/user/Documents/Coding/ResearchAgent/lib/search-run-events.ts)
- [search-run-progress.ts](/Users/user/Documents/Coding/ResearchAgent/lib/search-run-progress.ts)
- [route.ts](/Users/user/Documents/Coding/ResearchAgent/app/api/search-runs/events/route.ts)
- [search-runs-client.tsx](/Users/user/Documents/Coding/ResearchAgent/components/search-runs-client.tsx)
- [search-run-detail-client.tsx](/Users/user/Documents/Coding/ResearchAgent/components/search-run-detail-client.tsx)

Current progress stages:

- `load_profile`
- `discover_candidates`
- `enrich_candidates`
- `import_findings`
- `finished`

## AI Review Agents

AI review is a separate workflow from research discovery.

Research creates `Findings`.
AI review scores those findings.
Manual qualification still promotes a finding into an `Opportunity`.

### Review flow

For one finding, the AI review pipeline is:

1. Load the finding and selected profile
2. Parse existing structured context from `Findings.Structured Data`
3. Decide whether the finding needs more context
4. If needed, run an enrichment call with web search enabled
5. Run fit review and qualification scoring
6. Normalize the output
7. Write AI review fields back to Airtable

Implementation:

- `runAiReviewForFinding(...)`
- `runAiReviewBatch(...)`

in [ai-review.ts](/Users/user/Documents/Coding/ResearchAgent/lib/services/ai-review.ts).

### AI review enrichment

The AI review pipeline may enrich a finding again if the existing structured data is too thin.

That decision is currently based on:

- missing `detailSummary`
- too few metadata keys

Implementation:

- `shouldEnrichContext(...)`
- `enrichFindingContext(...)`

in [ai-review.ts](/Users/user/Documents/Coding/ResearchAgent/lib/services/ai-review.ts).

### Fit review output

The fit-ranking model returns:

- `fitScore`
- `priority`
- `recommendation`
- `confidence`
- `reason`
- `missingInformation`
- `nextBestAction`

The app then normalizes that into safe app enums and score ranges.

Implementation:

- `fitReviewPrompt(...)`
- `normalizeAiReview(...)`

in [ai-review.ts](/Users/user/Documents/Coding/ResearchAgent/lib/services/ai-review.ts).

### AI review writes

The following fields are written onto `Findings`:

- `AI Fit Score`
- `AI Priority`
- `AI Qualification`
- `AI Reasoning`
- `AI Confidence`
- `AI Reviewed At`
- `AI Profile`

The original `Decision` field remains human-controlled.

## Draft Generation Agent

Draft generation is a single model call that creates a structured outreach email draft for a specific:

- opportunity
- contact
- profile
- draft type

### Draft flow

1. Load the opportunity
2. Load the profile
3. Load contacts and resolve the target contact
4. Load existing drafts to compute version number
5. Call OpenAI for a structured draft
6. Save the draft to Airtable
7. Log a `Draft Created` outreach event
8. Move the opportunity stage to `Draft Ready`

Implementation:

- `generateDraft(...)`

in [drafts.ts](/Users/user/Documents/Coding/ResearchAgent/lib/services/drafts.ts).

### Draft types

Current supported draft types:

- `initial`
- `follow_up`
- `reply`

These map to Airtable-facing values in:

- [options.ts](/Users/user/Documents/Coding/ResearchAgent/lib/airtable/options.ts)

## Manual Qualification

AI review does not auto-create opportunities.

The current system is:

- AI discovery creates `Findings`
- AI review ranks them
- the user still qualifies/promotes them

Manual promotion happens in:

- `qualifyFinding(...)`

in [research.ts](/Users/user/Documents/Coding/ResearchAgent/lib/services/research.ts).

That step:

1. Reads the finding and its structured metadata
2. Checks for an existing matching opportunity
3. Creates the opportunity if needed
4. Creates a linked `Lab Details` or `Startup Details` row
5. Marks the finding as kept or duplicate

## Current Limits

The current implementation is intentionally simple and local-first.

Important limits:

- The SSE bus is in-memory, so it is suitable for local dev or one server instance only.
- Research is partially parallel, but AI review batch runs are still simpler and lower-throughput than a full job queue design.
- Discovery and enrichment are still OpenAI-driven, not source-specific scrapers.
- Qualification is human-approved, not fully automatic.
- Draft sending is still manual; the app logs events but does not send mail.

## Operational Summary

If you want to reason about the system in one sentence:

- research agents discover and enrich targets
- AI review agents score and recommend
- the user approves
- the draft agent writes the email

