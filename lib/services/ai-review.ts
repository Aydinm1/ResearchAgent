import { getFinding, getProfile, updateFinding } from "@/lib/airtable/repositories";
import { createOpenAiResponse } from "@/lib/openai";
import type {
  AiQualification,
  Finding,
  Priority,
  Profile,
  TargetType
} from "@/lib/types";
import { compactObject, parseJsonBlock } from "@/lib/utils";

type FindingContext = {
  aiReview?: Record<string, unknown>;
  detailSummary?: string;
  metadata?: Record<string, unknown>;
  missingInformation?: string[];
  nextBestAction?: string;
};

type AiReviewResult = {
  confidence: number;
  fitScore: number;
  missingInformation: string[];
  nextBestAction: string;
  priority: Priority;
  recommendation: AiQualification;
  reason: string;
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
    `Location preference: ${profile.locationPreference}`,
    `Availability: ${profile.availability}`,
    `Notes: ${profile.personalizationNotes}`
  ]
    .filter(Boolean)
    .join("\n");
}

function parseFindingContext(finding: Finding) {
  return parseJsonBlock<FindingContext>(finding.structuredData, {
    detailSummary: "",
    metadata: {}
  });
}

function metadataSummary(metadata: Record<string, unknown>) {
  return Object.entries(metadata)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) =>
      `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`
    )
    .join("\n");
}

function shouldEnrichContext(context: FindingContext) {
  const metadataKeys = Object.keys(context.metadata || {}).filter(Boolean);
  return !context.detailSummary || metadataKeys.length < 3;
}

function enrichmentPrompt(input: {
  context: FindingContext;
  finding: Finding;
  profile: Profile;
}) {
  const common = [
    "Return JSON only.",
    "Do not invent facts.",
    "Use web sources to fill in missing details."
  ].join(" ");

  if (input.finding.targetType === "lab") {
    return `
You are enriching a university lab finding for outreach qualification.
${common}

Profile:
${profileSummary(input.profile)}

Existing finding:
Title: ${input.finding.title}
Candidate name: ${input.finding.candidateName}
URL: ${input.finding.url}
Snippet: ${input.finding.snippet}
Current summary: ${input.context.detailSummary || "None"}
Current metadata:
${metadataSummary(input.context.metadata || {}) || "None"}

Return an object with:
- detailSummary
- metadata containing university, department, professor, researchAreas, methods, currentProjects, fundingSignal, undergradFriendly, applicationPath
`;
  }

  return `
You are enriching a startup finding for outreach qualification.
${common}

Profile:
${profileSummary(input.profile)}

Existing finding:
Title: ${input.finding.title}
Candidate name: ${input.finding.candidateName}
URL: ${input.finding.url}
Snippet: ${input.finding.snippet}
Current summary: ${input.context.detailSummary || "None"}
Current metadata:
${metadataSummary(input.context.metadata || {}) || "None"}

Return an object with:
- detailSummary
- metadata containing companySite, crunchbaseUrl, industry, businessModel, fundingStage, totalFunding, latestRoundType, latestRoundDate, hiringSignal, careersPage, relevantRoles, hq, remote, investors
`;
}

function fitReviewPrompt(input: {
  context: FindingContext;
  finding: Finding;
  profile: Profile;
}) {
  const targetInstructions =
    input.finding.targetType === "lab"
      ? "Assess fit for research-lab outreach and undergraduate involvement."
      : "Assess fit for startup outreach, internships, and likely hiring relevance.";

  return `
You are an AI fit-ranking and qualification reviewer.
Return JSON only.
Do not invent facts. If information is incomplete, reduce confidence and prefer "review" over "promote".

Profile:
${profileSummary(input.profile)}

Finding:
Target type: ${input.finding.targetType}
Title: ${input.finding.title}
Candidate name: ${input.finding.candidateName}
URL: ${input.finding.url}
Snippet: ${input.finding.snippet}
Summary: ${input.context.detailSummary || "None"}
Metadata:
${metadataSummary(input.context.metadata || {}) || "None"}

Instructions:
- ${targetInstructions}
- Score overall fit from 0 to 100.
- Confidence should reflect how complete and reliable the evidence is.
- Recommend exactly one of: promote, review, discard.
- Priority must be exactly one of: high, medium, low.
- Be concise and concrete.

Return an object with:
- fitScore
- priority
- recommendation
- confidence
- reason
- missingInformation (array of strings)
- nextBestAction
`;
}

function clampScore(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function normalizePriority(value: unknown, fitScore: number): Priority {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }
  if (fitScore >= 85) {
    return "high";
  }
  if (fitScore >= 60) {
    return "medium";
  }
  return "low";
}

function normalizeRecommendation(
  value: unknown,
  fitScore: number,
  confidence: number
): AiQualification {
  if (value === "promote" || value === "review" || value === "discard") {
    return value;
  }
  if (fitScore >= 85 && confidence >= 75) {
    return "promote";
  }
  if (fitScore < 60) {
    return "discard";
  }
  return "review";
}

function normalizeAiReview(raw: Record<string, unknown>): AiReviewResult {
  const fitScore = clampScore(raw.fitScore);
  const confidence = clampScore(raw.confidence);

  return {
    fitScore,
    confidence,
    priority: normalizePriority(raw.priority, fitScore),
    recommendation: normalizeRecommendation(raw.recommendation, fitScore, confidence),
    reason: typeof raw.reason === "string" && raw.reason.trim()
      ? raw.reason.trim()
      : "Insufficient explanation returned by the model.",
    missingInformation: Array.isArray(raw.missingInformation)
      ? raw.missingInformation.filter((item): item is string => typeof item === "string")
      : [],
    nextBestAction:
      typeof raw.nextBestAction === "string" && raw.nextBestAction.trim()
        ? raw.nextBestAction.trim()
        : "Review the source and decide whether to promote the finding."
  };
}

async function enrichFindingContext(input: {
  context: FindingContext;
  finding: Finding;
  profile: Profile;
}) {
  if (!shouldEnrichContext(input.context)) {
    return input.context;
  }

  const raw = await createOpenAiResponse({
    prompt: enrichmentPrompt(input),
    enableWebSearch: true
  });
  const enriched = parseJsonBlock<FindingContext>(raw, {
    detailSummary: input.context.detailSummary || "",
    metadata: input.context.metadata || {}
  });

  return {
    ...input.context,
    detailSummary: enriched.detailSummary || input.context.detailSummary || "",
    metadata: {
      ...(input.context.metadata || {}),
      ...(enriched.metadata || {})
    }
  };
}

export async function runAiReviewForFinding(input: {
  findingId: string;
  profileId: string;
}) {
  const [finding, profile] = await Promise.all([
    getFinding(input.findingId),
    getProfile(input.profileId)
  ]);

  let context = parseFindingContext(finding);
  context = await enrichFindingContext({
    context,
    finding,
    profile
  });

  const rawReview = await createOpenAiResponse({
    prompt: fitReviewPrompt({
      context,
      finding,
      profile
    })
  });
  const normalized = normalizeAiReview(
    parseJsonBlock<Record<string, unknown>>(rawReview, {})
  );
  const aiReviewedAt = new Date().toISOString();

  const nextStructuredData = JSON.stringify(
    compactObject({
      ...context,
      aiReview: {
        confidence: normalized.confidence,
        fitScore: normalized.fitScore,
        missingInformation: normalized.missingInformation,
        nextBestAction: normalized.nextBestAction,
        priority: normalized.priority,
        recommendation: normalized.recommendation,
        reason: normalized.reason,
        reviewedAt: aiReviewedAt
      },
      missingInformation: normalized.missingInformation,
      nextBestAction: normalized.nextBestAction
    }),
    null,
    2
  );

  return updateFinding(finding.id, {
    aiFitScore: normalized.fitScore,
    aiPriority: normalized.priority,
    aiQualification: normalized.recommendation,
    aiReasoning: normalized.reason,
    aiConfidence: normalized.confidence,
    aiReviewedAt,
    aiProfileIds: [profile.id],
    structuredData: nextStructuredData
  });
}

export async function runAiReviewBatch(input: {
  findingIds: string[];
  profileId: string;
}) {
  if (input.findingIds.length === 0) {
    throw new Error("No findings were provided for AI review.");
  }

  const findings: Finding[] = [];

  for (const findingId of input.findingIds) {
    findings.push(
      await runAiReviewForFinding({
        findingId,
        profileId: input.profileId
      })
    );
  }

  return findings;
}
