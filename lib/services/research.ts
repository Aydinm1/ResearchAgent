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
import {
  categoryTagPromptList,
  normalizeCategoryTags
} from "@/lib/category-tags";
import { getEnv } from "@/lib/env";
import { createOpenAiResponse } from "@/lib/openai";
import {
  completeSearchRunStep,
  createInitialSearchRunProgress,
  failSearchRunStep,
  serializeSearchRunProgress,
  setSearchRunMessage,
  startSearchRunStep,
  type SearchRunProgress,
  type SearchRunProgressStepKey
} from "@/lib/search-run-progress";
import type { Finding, Profile, SearchRun, TargetType } from "@/lib/types";
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

type RunResearchInput = {
  targetType: TargetType;
  profileId: string;
  queryText: string;
  filtersUsed: string;
  maxResults: number;
};

const openAiProgressNotes = [
  "OpenAI accepted the request. Starting web research.",
  "Searching relevant pages and sources on the web.",
  "Comparing sources and extracting structured details.",
  "Ranking likely matches and formatting results for import.",
  "Still researching. Waiting for the model to finish the response."
];

async function setSearchRunProgress(
  searchRunId: string,
  input: {
    progress: SearchRunProgress;
    resultCount?: number;
    importedCount?: number;
  }
) {
  await updateSearchRun(searchRunId, {
    status: "running",
    notes: serializeSearchRunProgress(input.progress),
    resultCount: input.resultCount,
    importedCount: input.importedCount
  });
}

type HeartbeatStage = {
  key: SearchRunProgressStepKey;
  message: string;
};

function startProgressHeartbeat(
  searchRunId: string,
  progress: SearchRunProgress,
  onProgress: (progress: SearchRunProgress) => void
) {
  let timerId: ReturnType<typeof setTimeout> | undefined;
  let noteIndex = 0;
  let stopped = false;
  const stages: HeartbeatStage[] = [
    {
      key: "web_research",
      message: "OpenAI accepted the request. Starting web research."
    },
    {
      key: "analyze_sources",
      message: "Searching relevant pages and comparing sources."
    },
    {
      key: "format_response",
      message: "Structuring results and preparing them for import."
    }
  ];
  let currentProgress = progress;
  let activeStep: SearchRunProgressStepKey = "openai_request";

  const tick = async () => {
    if (stopped) {
      return;
    }

    const stage = stages[Math.min(noteIndex, stages.length - 1)];
    const now = new Date().toISOString();
    noteIndex += 1;

    currentProgress = completeSearchRunStep(currentProgress, activeStep, now);
    activeStep = stage.key;
    currentProgress = startSearchRunStep(currentProgress, stage.key, stage.message, now);

    await setSearchRunProgress(searchRunId, {
      progress: currentProgress
    }).catch(() => undefined);
    onProgress(currentProgress);

    timerId = setTimeout(() => {
      void tick();
    }, 6000);
  };

  timerId = setTimeout(() => {
    void tick();
  }, 2500);

  return (finalMessage?: string) => {
    stopped = true;
    if (timerId) {
      clearTimeout(timerId);
    }

    const now = new Date().toISOString();
    currentProgress = completeSearchRunStep(currentProgress, activeStep, now);
    if (finalMessage) {
      currentProgress = setSearchRunMessage(currentProgress, finalMessage, now);
    }
    onProgress(currentProgress);
  };
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
    `categoryTags must use only these exact values: ${categoryTagPromptList()}.`,
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
    categoryTags: normalizeCategoryTags(result.categoryTags || []),
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

export async function startResearchRun(input: RunResearchInput): Promise<SearchRun> {
  const progress = createInitialSearchRunProgress();
  return createSearchRun({
    runName: `${input.targetType} research - ${new Date().toLocaleDateString("en-US")}`,
    targetType: input.targetType,
    source: "manual",
    queryText: input.queryText,
    filtersUsed: input.filtersUsed,
    profileId: input.profileId,
    status: "running",
    notes: serializeSearchRunProgress(progress)
  });
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
      "openai_request",
      "Sending research prompt to OpenAI with web search enabled."
    );
    await setSearchRunProgress(input.searchRunId, {
      progress,
      importedCount: 0,
      resultCount: 0
    });
    const stopHeartbeat = startProgressHeartbeat(input.searchRunId, progress, (nextProgress) => {
      progress = nextProgress;
    });
    const output = await createOpenAiResponse({
      prompt: buildResearchPrompt({
        targetType: input.targetType,
        profile,
        queryText: input.queryText,
        filtersUsed: input.filtersUsed,
        maxResults: input.maxResults
      }),
      enableWebSearch: true
    }).finally(() => {
      stopHeartbeat("OpenAI returned a response. Parsing candidate results.");
    });

    progress = startSearchRunStep(
      progress,
      "parse_results",
      "Parsing structured results returned by OpenAI."
    );
    const results = parseJsonBlock<ResearchResult[]>(output, []);
    progress = completeSearchRunStep(progress, "parse_results");
    progress = setSearchRunMessage(
      progress,
      `Received model response. Parsed ${results.length} candidate results.`
    );
    await setSearchRunProgress(input.searchRunId, {
      progress,
      resultCount: results.length,
      importedCount: 0
    });

    if (results.length === 0) {
      progress = startSearchRunStep(
        progress,
        "finished",
        "Completed with 0 findings. The model did not return any candidates for this query."
      );
      progress = completeSearchRunStep(progress, "finished");
      await updateSearchRun(input.searchRunId, {
        status: "completed",
        resultCount: 0,
        importedCount: 0,
        notes: serializeSearchRunProgress(
          setSearchRunMessage(
            progress,
            "Completed with 0 findings. The model did not return any candidates for this query. Try broadening the query or removing filters."
          )
        )
      });
      return [];
    }

    const findings = [];
    progress = startSearchRunStep(
      progress,
      "import_findings",
      `Saving ${results.length} findings to Airtable.`
    );
    await setSearchRunProgress(input.searchRunId, {
      progress,
      resultCount: results.length,
      importedCount: 0
    });

    for (const [index, result] of results.entries()) {
      const finding = await createFinding(toFinding(input.targetType, input.searchRunId, result));
      findings.push(finding);
      progress = setSearchRunMessage(
        progress,
        `Imported ${index + 1} of ${results.length} findings into Airtable.`
      );
      await setSearchRunProgress(input.searchRunId, {
        progress,
        resultCount: results.length,
        importedCount: index + 1
      });
    }

    progress = completeSearchRunStep(progress, "import_findings");
    progress = startSearchRunStep(
      progress,
      "finished",
      `Completed. Imported ${findings.length} of ${results.length} findings.`
    );
    progress = completeSearchRunStep(progress, "finished");
    await updateSearchRun(input.searchRunId, {
      status: "completed",
      resultCount: results.length,
      importedCount: findings.length,
      notes: serializeSearchRunProgress(progress)
    });

    return findings;
  } catch (error) {
    progress = failSearchRunStep(
      progress,
      "finished",
      error instanceof Error ? error.message : "Research run failed"
    );
    await updateSearchRun(input.searchRunId, {
      status: "failed",
      notes: serializeSearchRunProgress(progress)
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
