export type AirtableField = {
  name: string;
  type: string;
  options?: string[] | string;
  linked_table?: string;
  writable?: boolean;
  computed_from?: string;
};

export type AirtableTable = {
  name: string;
  description: string;
  primary_field: string;
  fields: AirtableField[];
};

export type AirtableView = {
  table: string;
  name: string;
  filter: string;
};

export type AirtableAutomation = {
  name: string;
  trigger: string;
  action: string;
};

export type AirtableBaseSchema = {
  base_name: string;
  version: string;
  defaults: {
    follow_up_days: number;
    active_profile_only: boolean;
  };
  enums: Record<string, string[]>;
  tables: AirtableTable[];
  recommended_views: AirtableView[];
  recommended_automations: AirtableAutomation[];
  dedupe_rules: Record<string, string[]>;
};

export type EntityId = string;

export type TargetType = "lab" | "startup";

export type OpportunityStage =
  | "discovered"
  | "researching"
  | "qualified"
  | "draft_ready"
  | "sent"
  | "follow_up_due"
  | "replied_positive"
  | "replied_neutral"
  | "replied_negative"
  | "closed";

export type Priority = "high" | "medium" | "low";

export type SearchRunStatus = "queued" | "running" | "completed" | "failed";

export type FindingDecision = "new" | "keep" | "discard" | "duplicate";

export type DraftType = "initial" | "follow_up" | "reply";

export type DraftStatus = "draft" | "needs_review" | "ready" | "sent" | "obsolete";

export type OutreachEventType =
  | "draft_created"
  | "sent"
  | "follow_up_sent"
  | "reply_received"
  | "meeting_requested"
  | "rejected"
  | "no_response_closed"
  | "note";

export type ResponseSentiment = "positive" | "neutral" | "negative";

export type ContactType =
  | "professor"
  | "pi"
  | "postdoc"
  | "graduate_student"
  | "founder"
  | "recruiter"
  | "team_member";

export type Profile = {
  id: EntityId;
  profileName: string;
  school: string;
  majors: string[];
  year: string;
  resumeUrl: string;
  interests: string;
  skills: string;
  projects: string;
  preferredRoles: string;
  locationPreference: string;
  availability: string;
  personalizationNotes: string;
  active: boolean;
};

export type SearchRun = {
  id: EntityId;
  runName: string;
  targetType: TargetType;
  source: string;
  queryText: string;
  filtersUsed: string;
  profileIds: EntityId[];
  runDate: string;
  status: SearchRunStatus;
  notes: string;
  resultCount: number;
  importedCount: number;
};

export type Finding = {
  id: EntityId;
  title: string;
  url: string;
  source: string;
  snippet: string;
  targetType: TargetType;
  searchRunIds: EntityId[];
  candidateName: string;
  categoryTags: string[];
  location: string;
  decision: FindingDecision | "";
  decisionReason: string;
  matchedOpportunityIds: EntityId[];
  lastVerified: string;
  structuredData: string;
};

export type Opportunity = {
  id: EntityId;
  name: string;
  targetType: TargetType;
  stage: OpportunityStage;
  fitScore: number;
  priority: Priority;
  whyFit: string;
  statusSummary: string;
  primaryCategory: string;
  categoryTags: string[];
  primaryContactIds: EntityId[];
  nextAction: string;
  nextFollowUpDate: string;
  lastActivityDate: string;
  outcome: string;
  owner: string;
  openClosed: "open" | "closed";
  profileIds: EntityId[];
  relatedFindingIds: EntityId[];
};

export type LabDetail = {
  id: EntityId;
  detailName: string;
  opportunityIds: EntityId[];
  university: string;
  department: string;
  professorPi: string;
  labPage: string;
  researchAreas: string;
  methods: string;
  currentProjectsSummary: string;
  recentPublicationsTopics: string;
  undergradFriendly: boolean;
  applicationPath: string;
  fundingSignal: string;
  manualNotes: string;
};

export type StartupDetail = {
  id: EntityId;
  detailName: string;
  opportunityIds: EntityId[];
  companySite: string;
  crunchbaseUrl: string;
  industry: string;
  businessModel: string;
  fundingStage: string;
  totalFunding: string;
  latestRoundType: string;
  latestRoundDate: string;
  hiringSignal: string;
  careersPage: string;
  relevantRoles: string;
  hq: string;
  remote: boolean;
  investors: string;
  manualNotes: string;
};

export type Contact = {
  id: EntityId;
  fullName: string;
  role: string;
  organizationLab: string;
  opportunityIds: EntityId[];
  email: string;
  linkedIn: string;
  contactType: ContactType | "";
  primary: boolean;
  confidence: number;
  warmCold: "warm" | "cold" | "";
  lastContacted: string;
  lastReplyDate: string;
  responseSentiment: ResponseSentiment | "";
  notes: string;
};

export type Draft = {
  id: EntityId;
  draftTitle: string;
  opportunityIds: EntityId[];
  contactIds: EntityId[];
  profileIds: EntityId[];
  draftType: DraftType;
  subject: string;
  body: string;
  personalizationHook: string;
  callToAction: string;
  status: DraftStatus;
  generatedAt: string;
  sourceSnapshot: string;
  version: number;
};

export type OutreachEvent = {
  id: EntityId;
  eventTitle: string;
  opportunityIds: EntityId[];
  contactIds: EntityId[];
  draftIds: EntityId[];
  eventType: OutreachEventType;
  eventDate: string;
  channel: "email" | "linkedin" | "manual_note";
  summary: string;
  rawReply: string;
  outcomeChange: string;
  nextFollowUpDate: string;
};

export type DashboardData = {
  profiles: Profile[];
  searchRuns: SearchRun[];
  findings: Finding[];
  opportunities: Opportunity[];
  drafts: Draft[];
  outreachEvents: OutreachEvent[];
  configured: boolean;
};
