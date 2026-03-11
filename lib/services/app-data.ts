import { hasAirtableConfig } from "@/lib/env";
import {
  listDrafts,
  listFindings,
  listOpportunities,
  listOutreachEvents,
  listProfiles,
  listSearchRuns
} from "@/lib/airtable/repositories";
import type { DashboardData } from "@/lib/types";

export async function getDashboardData(): Promise<DashboardData> {
  if (!hasAirtableConfig()) {
    return {
      configured: false,
      profiles: [],
      searchRuns: [],
      findings: [],
      opportunities: [],
      drafts: [],
      outreachEvents: []
    };
  }

  const [profiles, searchRuns, findings, opportunities, drafts, outreachEvents] =
    await Promise.all([
      listProfiles(),
      listSearchRuns(),
      listFindings(),
      listOpportunities(),
      listDrafts(),
      listOutreachEvents()
    ]);

  return {
    configured: true,
    profiles,
    searchRuns,
    findings,
    opportunities,
    drafts,
    outreachEvents
  };
}
