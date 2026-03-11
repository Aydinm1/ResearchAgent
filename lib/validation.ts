import { z } from "zod";

const csvString = z
  .string()
  .optional()
  .transform((value) =>
    (value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );

const optionalString = z.string().optional().transform((value) => value || "");

const optionalNumber = z
  .union([z.number(), z.string()])
  .optional()
  .transform((value) => {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      return Number(value) || 0;
    }
    return 0;
  });

export const createProfileSchema = z.object({
  profileName: z.string().min(1),
  school: optionalString,
  majors: csvString,
  year: optionalString,
  resumeUrl: optionalString,
  interests: optionalString,
  skills: optionalString,
  projects: optionalString,
  preferredRoles: optionalString,
  locationPreference: optionalString,
  availability: optionalString,
  personalizationNotes: optionalString,
  active: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => value === true || value === "on" || value === "true")
});

export const updateProfileSchema = createProfileSchema.extend({
  profileId: z.string().min(1)
});

export const createSearchRunSchema = z.object({
  runName: z.string().min(1),
  targetType: z.enum(["lab", "startup"]),
  source: z.string().min(1),
  queryText: optionalString,
  filtersUsed: optionalString,
  profileId: optionalString,
  notes: optionalString
});

export const runResearchSchema = z.object({
  profileId: z.string().min(1),
  queryText: optionalString,
  filtersUsed: optionalString,
  maxResults: optionalNumber
});

export const createOpportunitySchema = z.object({
  name: z.string().min(1),
  targetType: z.enum(["lab", "startup"]),
  stage: z
    .enum([
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
    ])
    .default("qualified"),
  fitScore: optionalNumber,
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  whyFit: optionalString,
  statusSummary: optionalString,
  primaryCategory: optionalString,
  categoryTags: csvString,
  nextAction: optionalString,
  nextFollowUpDate: optionalString,
  outcome: z.enum(["open", "closed"]).optional().default("open"),
  profileId: optionalString,
  findingId: optionalString,
  structuredData: optionalString
});

export const updateOpportunitySchema = z.object({
  stage: z
    .enum([
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
    ])
    .optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  nextAction: optionalString,
  nextFollowUpDate: optionalString,
  outcome: z.enum(["open", "closed"]).optional(),
  whyFit: optionalString,
  statusSummary: optionalString
});

export const createContactSchema = z.object({
  fullName: z.string().min(1),
  role: optionalString,
  organizationLab: optionalString,
  opportunityId: z.string().min(1),
  email: optionalString,
  linkedIn: optionalString,
  contactType: optionalString,
  primary: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => value === true || value === "on" || value === "true"),
  confidence: optionalNumber,
  warmCold: optionalString,
  notes: optionalString
});

export const createDraftSchema = z.object({
  opportunityId: z.string().min(1),
  contactId: z.string().min(1),
  profileId: z.string().min(1),
  draftType: z.enum(["initial", "follow_up", "reply"]).default("initial")
});

export const createOutreachEventSchema = z.object({
  opportunityId: z.string().min(1),
  contactId: optionalString,
  draftId: optionalString,
  eventType: z.enum([
    "draft_created",
    "sent",
    "follow_up_sent",
    "reply_received",
    "meeting_requested",
    "rejected",
    "no_response_closed",
    "note"
  ]),
  eventDate: optionalString,
  channel: z.enum(["email", "linkedin", "manual_note"]).default("email"),
  summary: optionalString,
  rawReply: optionalString,
  outcomeChange: optionalString,
  nextFollowUpDate: optionalString
});

export const qualifyFindingSchema = z.object({
  findingId: z.string().min(1),
  profileId: optionalString,
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  fitScore: optionalNumber
});
