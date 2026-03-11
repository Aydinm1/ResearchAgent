# TODO

## Done

- [x] Create the Next.js application scaffold
- [x] Define the Airtable schema and CSV templates
- [x] Add typed Airtable repositories and record mappers
- [x] Add env/config handling for Airtable and OpenAI
- [x] Implement API routes for profiles, opportunities, search runs, findings, drafts, contacts, and outreach events
- [x] Implement on-demand lab and startup research using OpenAI-backed web search
- [x] Implement finding qualification into opportunities and type-specific details
- [x] Implement OpenAI-backed draft generation
- [x] Implement manual outreach event logging and stage updates
- [x] Build pages for profiles, search runs, findings, opportunities, and drafts
- [x] Add setup banners for missing Airtable/OpenAI configuration
- [x] Add a proper success/error feedback layer for form submissions
- [x] Add detail pages or inline views for search runs and findings provenance
- [x] Expose list/detail APIs for contacts and outreach events directly
- [x] Add filtering, sorting, and search across opportunities, drafts, and findings
- [x] Keep the project building cleanly with `npm run lint` and `npm run build`

## Next

- [ ] Improve qualification dedupe with detail-table reads instead of name/url heuristics
- [ ] Persist richer structured research output than a JSON blob in `Findings`
- [ ] Add richer empty/loading/error states in the UI
- [ ] Add optimistic refresh or server actions for smoother operator workflows
- [ ] Add automated tests for Airtable mappers, request validation, research parsing, and draft generation
- [ ] Add fixture data or a seeded demo mode for local development without Airtable
- [ ] Add rate-limit/retry handling around Airtable and OpenAI calls
- [ ] Add structured logging and failure audit trails for research runs
- [ ] Add Gmail or another email-provider integration if manual send is no longer enough
- [ ] Add scheduled re-search and follow-up reminders if you want automation beyond on-demand runs
