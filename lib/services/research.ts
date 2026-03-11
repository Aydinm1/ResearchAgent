import {
  createFinding,
  createLabDetail,
  createOpportunity,
  createSearchRun,
  createStartupDetail,
  getFinding,
  getProfile,
  listOpportunities,
  updateFinding,
  updateSearchRun
} from "@/lib/airtable/repositories";
import { getEnv } from "@/lib/env";
import { createOpenAiResponse } from "@/lib/openai";
import type { Finding, Profile, TargetType } from "@/lib/types";
import { parseJsonBlock } from "@/lib/utils";

type ResearchResult = {
  title: string;
  url: string;
  source: string;
  snippet: string;
  candidateName: string;
  categoryTags: string[];
  location: string;
  whyFit: string;
  detailSummary: string;
  metadata?: Record<string, string | string[] | boolean>;
};

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

function buildResearchPrompt(input: {
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
    "Each object must include title, url, source, snippet, candidateName, categoryTags, location, whyFit, detailSummary, and metadata.",
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

function toFinding(
  targetType: TargetType,
  searchRunId: string,
  result: ResearchResult
): Omit<Finding, "id"> {
  return {
    title: result.title,
    url: result.url,
    source: result.source || "manual",
    snippet: result.snippet,
    targetType,
    searchRunIds: [searchRunId],
    candidateName: result.candidateName || result.title,
    categoryTags: result.categoryTags || [],
    location: result.location || "",
    decision: "new",
    decisionReason: result.whyFit || "",
    matchedOpportunityIds: [],
    lastVerified: new Date().toISOString(),
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

export async function runResearch(input: {
  targetType: TargetType;
  profileId: string;
  queryText: string;
  filtersUsed: string;
  maxResults: number;
}) {
  const profile = await getProfile(input.profileId);
  const searchRun = await createSearchRun({
    runName: `${input.targetType} research - ${new Date().toLocaleDateString("en-US")}`,
    targetType: input.targetType,
    source: "manual",
    queryText: input.queryText,
    filtersUsed: input.filtersUsed,
    profileId: input.profileId,
    status: "running",
    notes: ""
  });

  try {
    const output = await createOpenAiResponse({
      prompt: buildResearchPrompt({
        targetType: input.targetType,
        profile,
        queryText: input.queryText,
        filtersUsed: input.filtersUsed,
        maxResults: input.maxResults
      }),
      enableWebSearch: true
    });

    const results = parseJsonBlock<ResearchResult[]>(output, []);
    const findings = await Promise.all(
      results.map((result) =>
        createFinding(toFinding(input.targetType, searchRun.id, result))
      )
    );

    await updateSearchRun(searchRun.id, {
      status: "completed",
      resultCount: results.length,
      importedCount: findings.length
    });

    return { searchRunId: searchRun.id, findings };
  } catch (error) {
    await updateSearchRun(searchRun.id, {
      status: "failed",
      notes: error instanceof Error ? error.message : "Research run failed"
    });
    throw error;
  }
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
  }>(finding.structuredData, {
    detailSummary: "",
    metadata: {}
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
    whyFit: finding.decisionReason,
    statusSummary: parsed.detailSummary || finding.snippet,
    primaryCategory: finding.categoryTags[0] || "",
    categoryTags: finding.categoryTags,
    primaryContactIds: [],
    nextAction: "Review details and add a contact.",
    nextFollowUpDate: "",
    outcome: "",
    owner: getEnv().appOwner,
    openClosed: "open",
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
