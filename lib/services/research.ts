import {
  createFinding,
  createLabDetail,
  createOpportunity,
  createSearchRun,
  createStartupDetail,
  getFinding,
  getProfile,
  listFindings,
  listOpportunities,
  updateFinding,
  updateSearchRun
} from "@/lib/airtable/repositories";
import {
  categoryTagPromptList,
  normalizeCategoryTags
} from "@/lib/category-tags";
import { getEnv } from "@/lib/env";
import { createOpenAiResponse } from "@/lib/openai";
import { publishSearchRunEvent } from "@/lib/search-run-events";
import {
  completeSearchRunStep,
  createInitialSearchRunProgress,
  failSearchRunStep,
  serializeSearchRunProgress,
  setSearchRunMessage,
  startSearchRunStep,
  type SearchRunProgress
} from "@/lib/search-run-progress";
import type { Finding, Profile, SearchRun, TargetType } from "@/lib/types";
import { parseJsonBlock } from "@/lib/utils";

type DiscoveryCandidate = {
  title: string;
  url: string;
  source: string;
  snippet: string;
  candidateName: string;
};

type EnrichedResearchResult = DiscoveryCandidate & {
  categoryTags: string[];
  location: string;
  whyFit: string;
  detailSummary: string;
  metadata?: Record<string, string | string[] | boolean>;
};

type RunResearchInput = {
  targetType: TargetType;
  profileId: string;
  queryText: string;
  filtersUsed: string;
  maxResults: number;
};

function normalizeIdentityValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeUrlIdentity(url: string) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const pathname = parsed.pathname.replace(/\/+$/, "").toLowerCase() || "/";
    return `${hostname}${pathname}`;
  } catch {
    return normalizeIdentityValue(url);
  }
}

function normalizeUrlHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function buildCandidateIdentity(candidate: {
  candidateName: string;
  title: string;
  url: string;
}) {
  return {
    name: normalizeIdentityValue(candidate.candidateName || candidate.title),
    url: normalizeUrlIdentity(candidate.url),
    host: normalizeUrlHost(candidate.url)
  };
}

export function filterExistingCandidates(
  targetType: TargetType,
  candidates: DiscoveryCandidate[],
  existingFindings: Pick<Finding, "targetType" | "candidateName" | "title" | "url">[],
  existingOpportunities: Pick<{ name: string; targetType: TargetType }, "name" | "targetType">[]
) {
  const existingNames = new Set<string>();
  const existingUrls = new Set<string>();
  const existingHosts = new Set<string>();

  for (const finding of existingFindings) {
    if (finding.targetType !== targetType) {
      continue;
    }
    const identity = buildCandidateIdentity(finding);
    if (identity.name) {
      existingNames.add(identity.name);
    }
    if (identity.url) {
      existingUrls.add(identity.url);
    }
    if (identity.host) {
      existingHosts.add(identity.host);
    }
  }

  for (const opportunity of existingOpportunities) {
    if (opportunity.targetType !== targetType) {
      continue;
    }
    const name = normalizeIdentityValue(opportunity.name);
    if (name) {
      existingNames.add(name);
    }
  }

  const seenWithinRun = new Set<string>();
  const freshCandidates: DiscoveryCandidate[] = [];
  const skippedCandidates: DiscoveryCandidate[] = [];

  for (const candidate of candidates) {
    const identity = buildCandidateIdentity(candidate);
    const runKey = `${identity.name}|${identity.url}`;

    const alreadyExists =
      (identity.name && existingNames.has(identity.name)) ||
      (identity.url && existingUrls.has(identity.url)) ||
      (targetType === "startup" && identity.host && existingHosts.has(identity.host));

    if (alreadyExists || seenWithinRun.has(runKey)) {
      skippedCandidates.push(candidate);
      continue;
    }

    seenWithinRun.add(runKey);
    freshCandidates.push(candidate);
  }

  return { freshCandidates, skippedCandidates };
}

async function setSearchRunProgress(
  searchRunId: string,
  input: {
    progress: SearchRunProgress;
    resultCount?: number;
    importedCount?: number;
  }
) {
  const searchRun = await updateSearchRun(searchRunId, {
    status: "running",
    notes: serializeSearchRunProgress(input.progress),
    resultCount: input.resultCount,
    importedCount: input.importedCount
  });
  publishSearchRunEvent({
    type: "search-run.updated",
    searchRun,
    searchRunId: searchRun.id
  });
  return searchRun;
}

function profileSummary(profile: Profile) {
  return [
    `School: ${profile.school}`,
    `Majors: ${profile.majors.join(", ")}`,
    `Year: ${profile.year}`,
    `Interests: ${profile.interests}`,
    `Skills: ${profile.skills}`,
    `Projects: ${profile.projects}`,
    `Preferred roles: ${profile.preferredRoles}`,
    `Notes: ${profile.personalizationNotes}`
  ]
    .filter(Boolean)
    .join("\n");
}

function buildDiscoveryPrompt(input: {
  targetType: TargetType;
  profile: Profile;
  queryText: string;
  filtersUsed: string;
  maxResults: number;
}) {
  const common = [
    "Return JSON only.",
    "Return an array of objects.",
    `Return at most ${input.maxResults} items.`,
    "Each object must include title, url, source, snippet, and candidateName.",
    "Do not invent facts that are not supported by web sources.",
    "Prefer current and specific pages over generic homepages."
  ].join(" ");

  if (input.targetType === "lab") {
    return `
You are finding university labs and professors for a student outreach workflow.
${common}

Profile:
${profileSummary(input.profile)}

Search task:
- Focus on UC Davis and adjacent academic labs relevant to cognitive science and computer science.
- Prioritize labs where an undergraduate or early-career researcher could plausibly reach out.
- Query context: ${input.queryText || "Find strong-fit labs and professors."}
- Extra filters: ${input.filtersUsed || "None"}

The metadata object should include:
- university
- department
- professor
- researchAreas
- methods
- currentProjects
- fundingSignal
- undergradFriendly
- applicationPath
`;
  }

  return `
You are finding funded startups for a startup outreach workflow.
${common}

Profile:
${profileSummary(input.profile)}

Search task:
- Find startups relevant to this student's background and interests.
- Prefer companies that are funded, growing, hiring, or likely to start hiring soon.
- Query context: ${input.queryText || "Find funded startups aligned with the profile."}
- Extra filters: ${input.filtersUsed || "None"}

The metadata object should include:
- companySite
- crunchbaseUrl
- industry
- businessModel
- fundingStage
- totalFunding
- latestRoundType
- latestRoundDate
- hiringSignal
- careersPage
- relevantRoles
- hq
- remote
- investors
`;
}

function buildEnrichmentPrompt(input: {
  targetType: TargetType;
  profile: Profile;
  candidate: DiscoveryCandidate;
}) {
  const common = [
    "Return JSON only.",
    "Return one object.",
    "Include candidateName, categoryTags, location, whyFit, detailSummary, and metadata.",
    `categoryTags must use only these exact values: ${categoryTagPromptList()}.`,
    "Do not invent facts that are not supported by web sources.",
    "Use the candidate URL as the primary anchor for enrichment."
  ].join(" ");

  if (input.targetType === "lab") {
    return `
You are the enrichment agent for university lab outreach research.
${common}

Profile:
${profileSummary(input.profile)}

Candidate:
Title: ${input.candidate.title}
Candidate name: ${input.candidate.candidateName}
URL: ${input.candidate.url}
Source: ${input.candidate.source}
Snippet: ${input.candidate.snippet}

The metadata object should include:
- university
- department
- professor
- researchAreas
- methods
- currentProjects
- fundingSignal
- undergradFriendly
- applicationPath
`;
  }

  return `
You are the enrichment agent for startup outreach research.
${common}

Profile:
${profileSummary(input.profile)}

Candidate:
Title: ${input.candidate.title}
Candidate name: ${input.candidate.candidateName}
URL: ${input.candidate.url}
Source: ${input.candidate.source}
Snippet: ${input.candidate.snippet}

The metadata object should include:
- companySite
- crunchbaseUrl
- industry
- businessModel
- fundingStage
- totalFunding
- latestRoundType
- latestRoundDate
- hiringSignal
- careersPage
- relevantRoles
- hq
- remote
- investors
`;
}

function toFinding(
  targetType: TargetType,
  searchRunId: string,
  result: EnrichedResearchResult
): Omit<Finding, "id"> {
  return {
    title: result.title,
    url: result.url,
    source: result.source || "manual",
    snippet: result.snippet,
    targetType,
    searchRunIds: [searchRunId],
    candidateName: result.candidateName || result.title,
    categoryTags: normalizeCategoryTags(result.categoryTags || []),
    location: result.location || "",
    decision: "new",
    decisionReason: result.whyFit || "",
    matchedOpportunityIds: [],
    lastVerified: new Date().toISOString(),
    aiFitScore: 0,
    aiPriority: "",
    aiQualification: "",
    aiReasoning: "",
    aiConfidence: 0,
    aiReviewedAt: "",
    aiProfileIds: [],
    structuredData: JSON.stringify(
      {
        detailSummary: result.detailSummary,
        metadata: result.metadata || {}
      },
      null,
      2
    )
  };
}

async function discoverCandidates(input: {
  filtersUsed: string;
  maxResults: number;
  profile: Profile;
  queryText: string;
  targetType: TargetType;
}) {
  const output = await createOpenAiResponse({
    prompt: buildDiscoveryPrompt(input),
    enableWebSearch: true
  });
  const candidates = parseJsonBlock<DiscoveryCandidate[]>(output, []);
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    if (!candidate.url) {
      return false;
    }
    const key = `${candidate.candidateName}|${candidate.url}`.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function enrichCandidate(input: {
  candidate: DiscoveryCandidate;
  profile: Profile;
  targetType: TargetType;
}) {
  const output = await createOpenAiResponse({
    prompt: buildEnrichmentPrompt(input),
    enableWebSearch: true
  });
  const enriched = parseJsonBlock<Partial<EnrichedResearchResult>>(output, {});

  return {
    ...input.candidate,
    candidateName: enriched.candidateName || input.candidate.candidateName,
    categoryTags: normalizeCategoryTags(enriched.categoryTags || []),
    location: enriched.location || "",
    whyFit: enriched.whyFit || "",
    detailSummary: enriched.detailSummary || input.candidate.snippet,
    metadata: enriched.metadata || {}
  } satisfies EnrichedResearchResult;
}

async function runWithConcurrency<T, R>(
  values: T[],
  limit: number,
  task: (value: T, index: number) => Promise<R>
) {
  const results: R[] = new Array(values.length);
  let cursor = 0;

  async function worker() {
    while (cursor < values.length) {
      const currentIndex = cursor;
      cursor += 1;
      results[currentIndex] = await task(values[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, () => worker())
  );

  return results;
}

export async function startResearchRun(input: RunResearchInput): Promise<SearchRun> {
  const progress = createInitialSearchRunProgress();
  const searchRun = await createSearchRun({
    runName: `${input.targetType} research - ${new Date().toLocaleDateString("en-US")}`,
    targetType: input.targetType,
    source: "manual",
    queryText: input.queryText,
    filtersUsed: input.filtersUsed,
    profileId: input.profileId,
    status: "running",
    notes: serializeSearchRunProgress(progress)
  });
  publishSearchRunEvent({
    type: "search-run.updated",
    searchRun,
    searchRunId: searchRun.id
  });
  return searchRun;
}

export async function executeResearchRun(
  input: RunResearchInput & { searchRunId: string }
) {
  let progress = createInitialSearchRunProgress();

  try {
    progress = startSearchRunStep(progress, "load_profile", "Loading selected profile.");
    await setSearchRunProgress(input.searchRunId, {
      progress,
      importedCount: 0,
      resultCount: 0
    });
    const profile = await getProfile(input.profileId);
    progress = completeSearchRunStep(progress, "load_profile");

    progress = startSearchRunStep(
      progress,
      "discover_candidates",
      "Discovery agent is searching for candidate targets."
    );
    await setSearchRunProgress(input.searchRunId, {
      progress,
      importedCount: 0,
      resultCount: 0
    });
    const candidates = await discoverCandidates({
      targetType: input.targetType,
      profile,
      queryText: input.queryText,
      filtersUsed: input.filtersUsed,
      maxResults: input.maxResults
    });
    const [existingFindings, existingOpportunities] = await Promise.all([
      listFindings(),
      listOpportunities()
    ]);
    const { freshCandidates, skippedCandidates } = filterExistingCandidates(
      input.targetType,
      candidates,
      existingFindings,
      existingOpportunities
    );
    progress = completeSearchRunStep(progress, "discover_candidates");
    progress = setSearchRunMessage(
      progress,
      skippedCandidates.length > 0
        ? `Discovery agent found ${candidates.length} candidate targets and skipped ${skippedCandidates.length} existing entries. ${freshCandidates.length} new targets remain.`
        : `Discovery agent found ${freshCandidates.length} new candidate targets.`
    );
    await setSearchRunProgress(input.searchRunId, {
      progress,
      resultCount: freshCandidates.length,
      importedCount: 0
    });

    if (freshCandidates.length === 0) {
      progress = startSearchRunStep(
        progress,
        "finished",
        skippedCandidates.length > 0
          ? "Completed with 0 findings. All discovered candidates already exist in Airtable."
          : "Completed with 0 findings. The discovery agent did not return any candidates."
      );
      progress = completeSearchRunStep(progress, "finished");
      const searchRun = await updateSearchRun(input.searchRunId, {
        status: "completed",
        resultCount: 0,
        importedCount: 0,
        notes: serializeSearchRunProgress(
          setSearchRunMessage(
            progress,
            skippedCandidates.length > 0
              ? `Completed with 0 findings. All ${skippedCandidates.length} discovered candidates were already present in Airtable.`
              : "Completed with 0 findings. The discovery agent did not return any candidates. Try broadening the query or removing filters."
          )
        )
      });
      publishSearchRunEvent({
        type: "search-run.updated",
        searchRun,
        searchRunId: searchRun.id
      });
      return [];
    }

    progress = startSearchRunStep(
      progress,
      "enrich_candidates",
      `Enrichment agents are processing ${freshCandidates.length} new candidates in parallel.`
    );
    await setSearchRunProgress(input.searchRunId, {
      progress,
      resultCount: freshCandidates.length,
      importedCount: 0
    });
    let completedEnrichments = 0;
    let failedEnrichments = 0;
    const enrichmentResults = await runWithConcurrency(
      freshCandidates,
      3,
      async (candidate) => {
        try {
          return await enrichCandidate({
            candidate,
            profile,
            targetType: input.targetType
          });
        } catch {
          failedEnrichments += 1;
          return null;
        } finally {
          completedEnrichments += 1;
          progress = setSearchRunMessage(
            progress,
            `Enrichment agents completed ${completedEnrichments} of ${freshCandidates.length} new candidates.`
          );
          await setSearchRunProgress(input.searchRunId, {
            progress,
            resultCount: freshCandidates.length,
            importedCount: 0
          });
        }
      }
    );
    const enrichedResults = enrichmentResults.reduce<EnrichedResearchResult[]>(
      (results, result) => {
        if (result) {
          results.push(result);
        }
        return results;
      },
      []
    );
    progress = completeSearchRunStep(progress, "enrich_candidates");
    progress = setSearchRunMessage(
      progress,
      failedEnrichments > 0
        ? `Enrichment agents completed ${enrichedResults.length} candidate profiles. ${failedEnrichments} candidates failed enrichment.`
        : `Enrichment agents completed ${enrichedResults.length} candidate profiles.`
    );
    await setSearchRunProgress(input.searchRunId, {
      progress,
      resultCount: enrichedResults.length,
      importedCount: 0
    });

    if (enrichedResults.length === 0) {
      progress = startSearchRunStep(
        progress,
        "finished",
        "Completed with 0 findings. Candidate enrichment did not produce usable results."
      );
      progress = completeSearchRunStep(progress, "finished");
      const searchRun = await updateSearchRun(input.searchRunId, {
        status: "completed",
        resultCount: freshCandidates.length,
        importedCount: 0,
        notes: serializeSearchRunProgress(
          setSearchRunMessage(
            progress,
            "Completed with 0 findings. Discovery found candidates, but enrichment did not produce usable results."
          )
        )
      });
      publishSearchRunEvent({
        type: "search-run.updated",
        searchRun,
        searchRunId: searchRun.id
      });
      return [];
    }

    const findings = [];
    progress = startSearchRunStep(
      progress,
      "import_findings",
      `Saving ${enrichedResults.length} findings to Airtable.`
    );
    await setSearchRunProgress(input.searchRunId, {
      progress,
      resultCount: enrichedResults.length,
      importedCount: 0
    });

    for (const [index, result] of enrichedResults.entries()) {
      const finding = await createFinding(toFinding(input.targetType, input.searchRunId, result));
      findings.push(finding);
      publishSearchRunEvent({
        type: "finding.created",
        finding,
        searchRunId: input.searchRunId
      });
      progress = setSearchRunMessage(
        progress,
        `Imported ${index + 1} of ${enrichedResults.length} findings into Airtable.`
      );
      await setSearchRunProgress(input.searchRunId, {
        progress,
        resultCount: enrichedResults.length,
        importedCount: index + 1
      });
    }

    progress = completeSearchRunStep(progress, "import_findings");
    progress = startSearchRunStep(
      progress,
      "finished",
      `Completed. Imported ${findings.length} of ${enrichedResults.length} findings.`
    );
    progress = completeSearchRunStep(progress, "finished");
    const searchRun = await updateSearchRun(input.searchRunId, {
      status: "completed",
      resultCount: enrichedResults.length,
      importedCount: findings.length,
      notes: serializeSearchRunProgress(progress)
    });
    publishSearchRunEvent({
      type: "search-run.updated",
      searchRun,
      searchRunId: searchRun.id
    });

    return findings;
  } catch (error) {
    progress = failSearchRunStep(
      progress,
      "finished",
      error instanceof Error ? error.message : "Research run failed"
    );
    const searchRun = await updateSearchRun(input.searchRunId, {
      status: "failed",
      notes: serializeSearchRunProgress(progress)
    });
    publishSearchRunEvent({
      type: "search-run.updated",
      searchRun,
      searchRunId: searchRun.id
    });
    throw error;
  }
}

export async function runResearch(input: RunResearchInput) {
  const searchRun = await startResearchRun(input);
  const findings = await executeResearchRun({
    ...input,
    searchRunId: searchRun.id
  });
  return { searchRun, searchRunId: searchRun.id, findings };
}

export async function qualifyFinding(input: {
  findingId: string;
  profileId?: string;
  priority: "high" | "medium" | "low";
  fitScore: number;
}) {
  const finding = await getFinding(input.findingId);
  const parsed = parseJsonBlock<{
    detailSummary?: string;
    metadata?: Record<string, unknown>;
    nextBestAction?: string;
  }>(finding.structuredData, {
    detailSummary: "",
    metadata: {},
    nextBestAction: ""
  });
  const metadata = parsed.metadata || {};

  const existing = await listOpportunities();
  const matched = existing.find((opportunity) => {
    if (finding.targetType !== opportunity.targetType) {
      return false;
    }
    const candidateName = (finding.candidateName || finding.title).toLowerCase();
    const opportunityName = opportunity.name.toLowerCase();
    const companySite = String(metadata.companySite || "").toLowerCase();
    const findingUrl = finding.url.toLowerCase();

    return (
      candidateName === opportunityName ||
      (finding.targetType === "startup" &&
        companySite &&
        (opportunity.statusSummary.toLowerCase().includes(companySite) ||
          findingUrl.includes(companySite)))
    );
  });

  if (matched) {
    await updateFinding(finding.id, {
      decision: "duplicate",
      decisionReason: "Merged into existing opportunity.",
      matchedOpportunityIds: [matched.id]
    });
    return matched;
  }

  const opportunity = await createOpportunity({
    name: finding.candidateName || finding.title,
    targetType: finding.targetType,
    stage: "qualified",
    fitScore: input.fitScore,
    priority: input.priority,
    whyFit: finding.aiReasoning || finding.decisionReason,
    statusSummary: parsed.detailSummary || finding.snippet,
    primaryCategory: finding.categoryTags[0] || "",
    categoryTags: finding.categoryTags,
    primaryContactIds: [],
    nextAction: parsed.nextBestAction || "Review details and add a contact.",
    nextFollowUpDate: "",
    outcome: "open",
    owner: getEnv().appOwner,
    profileIds: input.profileId ? [input.profileId] : [],
    relatedFindingIds: [finding.id]
  });

  if (finding.targetType === "lab") {
    await createLabDetail({
      detailName: `${opportunity.name} Details`,
      opportunityIds: [opportunity.id],
      university: String(metadata.university || ""),
      department: String(metadata.department || ""),
      professorPi: String(metadata.professor || ""),
      labPage: finding.url,
      researchAreas: Array.isArray(metadata.researchAreas)
        ? metadata.researchAreas.join(", ")
        : String(metadata.researchAreas || ""),
      methods: Array.isArray(metadata.methods)
        ? metadata.methods.join(", ")
        : String(metadata.methods || ""),
      currentProjectsSummary: String(metadata.currentProjects || ""),
      recentPublicationsTopics: "",
      undergradFriendly: Boolean(metadata.undergradFriendly),
      applicationPath: String(metadata.applicationPath || ""),
      fundingSignal: String(metadata.fundingSignal || ""),
      manualNotes: parsed.detailSummary || ""
    });
  } else {
    await createStartupDetail({
      detailName: `${opportunity.name} Details`,
      opportunityIds: [opportunity.id],
      companySite: String(metadata.companySite || finding.url || ""),
      crunchbaseUrl: String(metadata.crunchbaseUrl || ""),
      industry: String(metadata.industry || ""),
      businessModel: String(metadata.businessModel || ""),
      fundingStage: String(metadata.fundingStage || ""),
      totalFunding: String(metadata.totalFunding || ""),
      latestRoundType: String(metadata.latestRoundType || ""),
      latestRoundDate: String(metadata.latestRoundDate || ""),
      hiringSignal: String(metadata.hiringSignal || ""),
      careersPage: String(metadata.careersPage || ""),
      relevantRoles: Array.isArray(metadata.relevantRoles)
        ? metadata.relevantRoles.join(", ")
        : String(metadata.relevantRoles || ""),
      hq: String(metadata.hq || ""),
      remote: Boolean(metadata.remote),
      investors: Array.isArray(metadata.investors)
        ? metadata.investors.join(", ")
        : String(metadata.investors || ""),
      manualNotes: parsed.detailSummary || ""
    });
  }

  await updateFinding(finding.id, {
    decision: "keep",
    decisionReason: "Promoted into an opportunity.",
    matchedOpportunityIds: [opportunity.id]
  });

  return opportunity;
}
