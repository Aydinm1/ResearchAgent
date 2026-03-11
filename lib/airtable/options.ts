import type {
  AiQualification,
  ContactType,
  DraftStatus,
  DraftType,
  FindingDecision,
  OutcomeStatus,
  OpportunityStage,
  OutreachEventType,
  Priority,
  SearchRunStatus,
  TargetType
} from "@/lib/types";

const targetTypeToAirtable: Record<TargetType, string> = {
  lab: "Lab",
  startup: "Startup"
};

const targetTypeFromAirtable: Record<string, TargetType> = {
  Lab: "lab",
  Startup: "startup",
  lab: "lab",
  startup: "startup"
};

const priorityToAirtable: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low"
};

const priorityFromAirtable: Record<string, Priority> = {
  High: "high",
  Medium: "medium",
  Low: "low",
  high: "high",
  medium: "medium",
  low: "low"
};

const stageToAirtable: Record<OpportunityStage, string> = {
  discovered: "Discovered",
  researching: "Researching",
  qualified: "Qualified",
  draft_ready: "Draft Ready",
  sent: "Sent",
  follow_up_due: "Follow-Up Due",
  replied_positive: "Replied Positive",
  replied_neutral: "Replied Neutral",
  replied_negative: "Replied Negative",
  closed: "Closed"
};

const stageFromAirtable: Record<string, OpportunityStage> = {
  Discovered: "discovered",
  Researching: "researching",
  Qualified: "qualified",
  "Draft Ready": "draft_ready",
  Sent: "sent",
  "Follow-Up Due": "follow_up_due",
  "Replied Positive": "replied_positive",
  "Replied Neutral": "replied_neutral",
  "Replied Negative": "replied_negative",
  Closed: "closed",
  discovered: "discovered",
  researching: "researching",
  qualified: "qualified",
  draft_ready: "draft_ready",
  sent: "sent",
  follow_up_due: "follow_up_due",
  replied_positive: "replied_positive",
  replied_neutral: "replied_neutral",
  replied_negative: "replied_negative",
  closed: "closed"
};

const searchRunStatusToAirtable: Record<SearchRunStatus, string> = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  failed: "Failed"
};

const searchRunStatusFromAirtable: Record<string, SearchRunStatus> = {
  Queued: "queued",
  Running: "running",
  Completed: "completed",
  Failed: "failed",
  queued: "queued",
  running: "running",
  completed: "completed",
  failed: "failed"
};

const findingDecisionToAirtable: Record<FindingDecision, string> = {
  new: "New",
  keep: "Keep",
  discard: "Discard",
  duplicate: "Duplicate"
};

const findingDecisionFromAirtable: Record<string, FindingDecision> = {
  New: "new",
  Keep: "keep",
  Discard: "discard",
  Duplicate: "duplicate",
  new: "new",
  keep: "keep",
  discard: "discard",
  duplicate: "duplicate"
};

const aiQualificationToAirtable: Record<AiQualification, string> = {
  promote: "Promote",
  review: "Review",
  discard: "Discard"
};

const aiQualificationFromAirtable: Record<string, AiQualification> = {
  Promote: "promote",
  Review: "review",
  Discard: "discard",
  promote: "promote",
  review: "review",
  discard: "discard"
};

const draftTypeToAirtable: Record<DraftType, string> = {
  initial: "Initial",
  follow_up: "Follow-up",
  reply: "Reply"
};

const draftTypeFromAirtable: Record<string, DraftType> = {
  Initial: "initial",
  "Follow-up": "follow_up",
  "Follow Up": "follow_up",
  Reply: "reply",
  initial: "initial",
  follow_up: "follow_up",
  reply: "reply"
};

const draftStatusToAirtable: Record<DraftStatus, string> = {
  draft: "Draft",
  needs_review: "Needs Review",
  ready: "Ready",
  sent: "Sent",
  obsolete: "Obsolete"
};

const draftStatusFromAirtable: Record<string, DraftStatus> = {
  Draft: "draft",
  "Needs Review": "needs_review",
  Ready: "ready",
  Sent: "sent",
  Obsolete: "obsolete",
  draft: "draft",
  needs_review: "needs_review",
  ready: "ready",
  sent: "sent",
  obsolete: "obsolete"
};

const outreachEventTypeToAirtable: Record<OutreachEventType, string> = {
  draft_created: "Draft Created",
  sent: "Sent",
  follow_up_sent: "Follow-Up Sent",
  reply_received: "Reply Received",
  meeting_requested: "Meeting Requested",
  rejected: "Rejected",
  no_response_closed: "No Response Closed",
  note: "Note"
};

const outreachEventTypeFromAirtable: Record<string, OutreachEventType> = {
  "Draft Created": "draft_created",
  Sent: "sent",
  "Follow-Up Sent": "follow_up_sent",
  "Reply Received": "reply_received",
  "Meeting Requested": "meeting_requested",
  Rejected: "rejected",
  "No Response Closed": "no_response_closed",
  Note: "note",
  draft_created: "draft_created",
  sent: "sent",
  follow_up_sent: "follow_up_sent",
  reply_received: "reply_received",
  meeting_requested: "meeting_requested",
  rejected: "rejected",
  no_response_closed: "no_response_closed",
  note: "note"
};

const channelToAirtable = {
  email: "Email",
  linkedin: "LinkedIn",
  manual_note: "Manual Note"
} as const;

const channelFromAirtable = {
  Email: "email",
  LinkedIn: "linkedin",
  "Manual Note": "manual_note",
  Phone: "email",
  Other: "manual_note",
  email: "email",
  linkedin: "linkedin",
  manual_note: "manual_note"
} as const;

const contactTypeToAirtable: Record<ContactType, string> = {
  professor: "Professor",
  pi: "PI",
  postdoc: "Postdoc",
  graduate_student: "Graduate Student",
  founder: "Founder",
  recruiter: "Recruiter",
  team_member: "Team Member"
};

const contactTypeFromAirtable: Record<string, ContactType> = {
  Professor: "professor",
  PI: "pi",
  Postdoc: "postdoc",
  "Graduate Student": "graduate_student",
  Founder: "founder",
  Recruiter: "recruiter",
  "Team Member": "team_member",
  professor: "professor",
  pi: "pi",
  postdoc: "postdoc",
  graduate_student: "graduate_student",
  founder: "founder",
  recruiter: "recruiter",
  team_member: "team_member"
};

const warmColdToAirtable = {
  warm: "Warm",
  cold: "Cold"
} as const;

const warmColdFromAirtable = {
  Warm: "warm",
  Cold: "cold",
  warm: "warm",
  cold: "cold"
} as const;

const responseSentimentToAirtable = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative"
} as const;

const responseSentimentFromAirtable = {
  Positive: "positive",
  Neutral: "neutral",
  Negative: "negative",
  "No Reply": "",
  positive: "positive",
  neutral: "neutral",
  negative: "negative"
} as const;

const outcomeStatusToAirtable: Record<OutcomeStatus, string> = {
  open: "Open",
  closed: "Closed"
};

const outcomeStatusFromAirtable: Record<string, OutcomeStatus> = {
  Open: "open",
  Closed: "closed",
  open: "open",
  closed: "closed"
};

export function toAirtableTargetType(value: TargetType) {
  return targetTypeToAirtable[value];
}

export function fromAirtableTargetType(value: string): TargetType {
  return targetTypeFromAirtable[value] || "lab";
}

export function toAirtablePriority(value: Priority) {
  return priorityToAirtable[value];
}

export function fromAirtablePriority(value: string): Priority {
  return priorityFromAirtable[value] || "medium";
}

export function toAirtableOpportunityStage(value: OpportunityStage) {
  return stageToAirtable[value];
}

export function fromAirtableOpportunityStage(value: string): OpportunityStage {
  return stageFromAirtable[value] || "discovered";
}

export function toAirtableSearchRunStatus(value: SearchRunStatus) {
  return searchRunStatusToAirtable[value];
}

export function fromAirtableSearchRunStatus(value: string): SearchRunStatus {
  return searchRunStatusFromAirtable[value] || "queued";
}

export function toAirtableFindingDecision(value: FindingDecision) {
  return findingDecisionToAirtable[value];
}

export function fromAirtableFindingDecision(value: string): FindingDecision {
  return findingDecisionFromAirtable[value] || "new";
}

export function toAirtableAiQualification(value: AiQualification) {
  return aiQualificationToAirtable[value];
}

export function fromAirtableAiQualification(value: string): AiQualification {
  return aiQualificationFromAirtable[value] || "review";
}

export function toAirtableDraftType(value: DraftType) {
  return draftTypeToAirtable[value];
}

export function fromAirtableDraftType(value: string): DraftType {
  return draftTypeFromAirtable[value] || "initial";
}

export function toAirtableDraftStatus(value: DraftStatus) {
  return draftStatusToAirtable[value];
}

export function fromAirtableDraftStatus(value: string): DraftStatus {
  return draftStatusFromAirtable[value] || "draft";
}

export function toAirtableOutreachEventType(value: OutreachEventType) {
  return outreachEventTypeToAirtable[value];
}

export function fromAirtableOutreachEventType(value: string): OutreachEventType {
  return outreachEventTypeFromAirtable[value] || "note";
}

export function toAirtableChannel(value: "email" | "linkedin" | "manual_note") {
  return channelToAirtable[value];
}

export function fromAirtableChannel(value: string): "email" | "linkedin" | "manual_note" {
  return channelFromAirtable[value as keyof typeof channelFromAirtable] || "email";
}

export function toAirtableContactType(value: ContactType) {
  return contactTypeToAirtable[value];
}

export function fromAirtableContactType(value: string): ContactType | "" {
  return contactTypeFromAirtable[value] || "";
}

export function toAirtableWarmCold(value: "warm" | "cold") {
  return warmColdToAirtable[value];
}

export function fromAirtableWarmCold(value: string): "warm" | "cold" | "" {
  return warmColdFromAirtable[value as keyof typeof warmColdFromAirtable] || "";
}

export function toAirtableResponseSentiment(value: "positive" | "neutral" | "negative") {
  return responseSentimentToAirtable[value];
}

export function fromAirtableResponseSentiment(
  value: string
): "positive" | "neutral" | "negative" | "" {
  return responseSentimentFromAirtable[
    value as keyof typeof responseSentimentFromAirtable
  ] || "";
}

export function toAirtableOutcomeStatus(value: OutcomeStatus) {
  return outcomeStatusToAirtable[value];
}

export function fromAirtableOutcomeStatus(value: string): OutcomeStatus {
  return outcomeStatusFromAirtable[value] || "open";
}
