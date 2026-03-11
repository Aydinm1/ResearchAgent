import {
  createRecord,
  getRecord,
  listRecords,
  updateRecord
} from "@/lib/airtable/client";
import { getEnv } from "@/lib/env";
import type {
  Contact,
  Draft,
  DraftType,
  Finding,
  FindingDecision,
  LabDetail,
  Opportunity,
  OpportunityStage,
  OutreachEvent,
  Priority,
  Profile,
  ResponseSentiment,
  SearchRun,
  SearchRunStatus,
  StartupDetail,
  TargetType
} from "@/lib/types";
import {
  asBoolean,
  asLinkedIds,
  asNumber,
  asString,
  asStringArray,
  toIsoDate
} from "@/lib/utils";

const tables = {
  profiles: "Profiles",
  searchRuns: "Search Runs",
  findings: "Findings",
  opportunities: "Opportunities",
  labDetails: "Lab Details",
  startupDetails: "Startup Details",
  contacts: "Contacts",
  drafts: "Drafts",
  outreachEvents: "Outreach Events"
} as const;

type AirtableFields = Record<string, unknown>;

function mapProfile(record: { id: string; fields: AirtableFields }): Profile {
  return {
    id: record.id,
    profileName: asString(record.fields["Profile Name"]),
    school: asString(record.fields["School"]),
    majors: asStringArray(record.fields["Majors"]),
    year: asString(record.fields["Year"]),
    resumeUrl: asString(record.fields["Resume URL"]),
    interests: asString(record.fields["Interests"]),
    skills: asString(record.fields["Skills"]),
    projects: asString(record.fields["Projects"]),
    preferredRoles: asString(record.fields["Preferred Roles"]),
    locationPreference: asString(record.fields["Location Preference"]),
    availability: asString(record.fields["Availability"]),
    personalizationNotes: asString(record.fields["Personalization Notes"]),
    active: asBoolean(record.fields["Active"])
  };
}

function mapSearchRun(record: { id: string; fields: AirtableFields }): SearchRun {
  return {
    id: record.id,
    runName: asString(record.fields["Run Name"]),
    targetType: asString(record.fields["Target Type"]) as TargetType,
    source: asString(record.fields["Source"]),
    queryText: asString(record.fields["Query Text"]),
    filtersUsed: asString(record.fields["Filters Used"]),
    profileIds: asLinkedIds(record.fields["Profile"]),
    runDate: toIsoDate(record.fields["Run Date"]),
    status: asString(record.fields["Status"]) as SearchRunStatus,
    notes: asString(record.fields["Notes"]),
    resultCount: asNumber(record.fields["Result Count"]),
    importedCount: asNumber(record.fields["Imported Count"])
  };
}

function mapFinding(record: { id: string; fields: AirtableFields }): Finding {
  return {
    id: record.id,
    title: asString(record.fields["Title"]),
    url: asString(record.fields["URL"]),
    source: asString(record.fields["Source"]),
    snippet: asString(record.fields["Snippet"]),
    targetType: asString(record.fields["Target Type"]) as TargetType,
    searchRunIds: asLinkedIds(record.fields["Search Run"]),
    candidateName: asString(record.fields["Candidate Name"]),
    categoryTags: asStringArray(record.fields["Category Tags"]),
    location: asString(record.fields["Location"]),
    decision: asString(record.fields["Decision"]) as FindingDecision | "",
    decisionReason: asString(record.fields["Decision Reason"]),
    matchedOpportunityIds: asLinkedIds(record.fields["Matched Opportunity"]),
    lastVerified: toIsoDate(record.fields["Last Verified"]),
    structuredData: asString(record.fields["Structured Data"])
  };
}

function mapOpportunity(record: { id: string; fields: AirtableFields }): Opportunity {
  return {
    id: record.id,
    name: asString(record.fields["Name"]),
    targetType: asString(record.fields["Target Type"]) as TargetType,
    stage: asString(record.fields["Stage"]) as OpportunityStage,
    fitScore: asNumber(record.fields["Fit Score"]),
    priority: asString(record.fields["Priority"]) as Priority,
    whyFit: asString(record.fields["Why Fit"]),
    statusSummary: asString(record.fields["Status Summary"]),
    primaryCategory: asString(record.fields["Primary Category"]),
    categoryTags: asStringArray(record.fields["Category Tags"]),
    primaryContactIds: asLinkedIds(record.fields["Primary Contact"]),
    nextAction: asString(record.fields["Next Action"]),
    nextFollowUpDate: toIsoDate(record.fields["Next Follow-Up Date"]),
    lastActivityDate: toIsoDate(record.fields["Last Activity Date"]),
    outcome: asString(record.fields["Outcome"]),
    owner: asString(record.fields["Owner"]),
    openClosed: (asString(record.fields["Open/Closed"]) || "open") as
      | "open"
      | "closed",
    profileIds: asLinkedIds(record.fields["Profile"]),
    relatedFindingIds: asLinkedIds(record.fields["Related Findings"])
  };
}

function mapLabDetail(record: { id: string; fields: AirtableFields }): LabDetail {
  return {
    id: record.id,
    detailName: asString(record.fields["Detail Name"]),
    opportunityIds: asLinkedIds(record.fields["Opportunity"]),
    university: asString(record.fields["University"]),
    department: asString(record.fields["Department"]),
    professorPi: asString(record.fields["Professor/PI"]),
    labPage: asString(record.fields["Lab Page"]),
    researchAreas: asString(record.fields["Research Areas"]),
    methods: asString(record.fields["Methods"]),
    currentProjectsSummary: asString(record.fields["Current Projects Summary"]),
    recentPublicationsTopics: asString(record.fields["Recent Publications/Topics"]),
    undergradFriendly: asBoolean(record.fields["Undergrad Friendly"]),
    applicationPath: asString(record.fields["Application Path"]),
    fundingSignal: asString(record.fields["Funding Signal"]),
    manualNotes: asString(record.fields["Manual Notes"])
  };
}

function mapStartupDetail(record: {
  id: string;
  fields: AirtableFields;
}): StartupDetail {
  return {
    id: record.id,
    detailName: asString(record.fields["Detail Name"]),
    opportunityIds: asLinkedIds(record.fields["Opportunity"]),
    companySite: asString(record.fields["Company Site"]),
    crunchbaseUrl: asString(record.fields["Crunchbase URL"]),
    industry: asString(record.fields["Industry"]),
    businessModel: asString(record.fields["Business Model"]),
    fundingStage: asString(record.fields["Funding Stage"]),
    totalFunding: asString(record.fields["Total Funding"]),
    latestRoundType: asString(record.fields["Latest Round Type"]),
    latestRoundDate: toIsoDate(record.fields["Latest Round Date"]),
    hiringSignal: asString(record.fields["Hiring Signal"]),
    careersPage: asString(record.fields["Careers Page"]),
    relevantRoles: asString(record.fields["Relevant Roles"]),
    hq: asString(record.fields["HQ"]),
    remote: asBoolean(record.fields["Remote"]),
    investors: asString(record.fields["Investors"]),
    manualNotes: asString(record.fields["Manual Notes"])
  };
}

function mapContact(record: { id: string; fields: AirtableFields }): Contact {
  return {
    id: record.id,
    fullName: asString(record.fields["Full Name"]),
    role: asString(record.fields["Role"]),
    organizationLab: asString(record.fields["Organization/Lab"]),
    opportunityIds: asLinkedIds(record.fields["Opportunity"]),
    email: asString(record.fields["Email"]),
    linkedIn: asString(record.fields["LinkedIn"]),
    contactType: asString(record.fields["Contact Type"]) as Contact["contactType"],
    primary: asBoolean(record.fields["Primary"]),
    confidence: asNumber(record.fields["Confidence"]),
    warmCold: asString(record.fields["Warm/Cold"]) as Contact["warmCold"],
    lastContacted: toIsoDate(record.fields["Last Contacted"]),
    lastReplyDate: toIsoDate(record.fields["Last Reply Date"]),
    responseSentiment: asString(
      record.fields["Response Sentiment"]
    ) as ResponseSentiment | "",
    notes: asString(record.fields["Notes"])
  };
}

function mapDraft(record: { id: string; fields: AirtableFields }): Draft {
  return {
    id: record.id,
    draftTitle: asString(record.fields["Draft Title"]),
    opportunityIds: asLinkedIds(record.fields["Opportunity"]),
    contactIds: asLinkedIds(record.fields["Contact"]),
    profileIds: asLinkedIds(record.fields["Profile"]),
    draftType: asString(record.fields["Draft Type"]) as DraftType,
    subject: asString(record.fields["Subject"]),
    body: asString(record.fields["Body"]),
    personalizationHook: asString(record.fields["Personalization Hook"]),
    callToAction: asString(record.fields["Call To Action"]),
    status: asString(record.fields["Status"]) as Draft["status"],
    generatedAt: toIsoDate(record.fields["Generated At"]),
    sourceSnapshot: asString(record.fields["Source Snapshot"]),
    version: asNumber(record.fields["Version"])
  };
}

function mapOutreachEvent(record: {
  id: string;
  fields: AirtableFields;
}): OutreachEvent {
  return {
    id: record.id,
    eventTitle: asString(record.fields["Event Title"]),
    opportunityIds: asLinkedIds(record.fields["Opportunity"]),
    contactIds: asLinkedIds(record.fields["Contact"]),
    draftIds: asLinkedIds(record.fields["Draft"]),
    eventType: asString(record.fields["Event Type"]) as OutreachEvent["eventType"],
    eventDate: toIsoDate(record.fields["Event Date"]),
    channel: (asString(record.fields["Channel"]) || "email") as OutreachEvent["channel"],
    summary: asString(record.fields["Summary"]),
    rawReply: asString(record.fields["Raw Reply"]),
    outcomeChange: asString(record.fields["Outcome Change"]),
    nextFollowUpDate: toIsoDate(record.fields["Next Follow-Up Date"])
  };
}

export async function listProfiles() {
  const records = await listRecords<AirtableFields>(tables.profiles);
  return records.map(mapProfile);
}

export async function createProfile(input: Omit<Profile, "id">) {
  const record = await createRecord(tables.profiles, {
    "Profile Name": input.profileName,
    School: input.school,
    Majors: input.majors,
    Year: input.year,
    "Resume URL": input.resumeUrl,
    Interests: input.interests,
    Skills: input.skills,
    Projects: input.projects,
    "Preferred Roles": input.preferredRoles,
    "Location Preference": input.locationPreference,
    Availability: input.availability,
    "Personalization Notes": input.personalizationNotes,
    Active: input.active
  });
  return mapProfile(record);
}

export async function getProfile(profileId: string) {
  const record = await getRecord<AirtableFields>(tables.profiles, profileId);
  return mapProfile(record);
}

export async function updateProfile(
  profileId: string,
  input: Omit<Profile, "id">
) {
  const record = await updateRecord(tables.profiles, profileId, {
    "Profile Name": input.profileName,
    School: input.school,
    Majors: input.majors,
    Year: input.year,
    "Resume URL": input.resumeUrl,
    Interests: input.interests,
    Skills: input.skills,
    Projects: input.projects,
    "Preferred Roles": input.preferredRoles,
    "Location Preference": input.locationPreference,
    Availability: input.availability,
    "Personalization Notes": input.personalizationNotes,
    Active: input.active
  });
  return mapProfile(record);
}

export async function listSearchRuns() {
  const records = await listRecords<AirtableFields>(tables.searchRuns);
  return records.map(mapSearchRun);
}

export async function createSearchRun(input: {
  runName: string;
  targetType: TargetType;
  source: string;
  queryText: string;
  filtersUsed: string;
  profileId?: string;
  status: SearchRunStatus;
  notes: string;
}) {
  const record = await createRecord(tables.searchRuns, {
    "Run Name": input.runName,
    "Target Type": input.targetType,
    Source: input.source,
    "Query Text": input.queryText,
    "Filters Used": input.filtersUsed,
    Profile: input.profileId ? [input.profileId] : undefined,
    "Run Date": new Date().toISOString(),
    Status: input.status,
    Notes: input.notes,
    "Result Count": 0,
    "Imported Count": 0
  });
  return mapSearchRun(record);
}

export async function getSearchRun(searchRunId: string) {
  const record = await getRecord<AirtableFields>(tables.searchRuns, searchRunId);
  return mapSearchRun(record);
}

export async function updateSearchRun(
  searchRunId: string,
  input: Partial<{
    status: SearchRunStatus;
    notes: string;
    resultCount: number;
    importedCount: number;
  }>
) {
  const record = await updateRecord(tables.searchRuns, searchRunId, {
    Status: input.status,
    Notes: input.notes,
    "Result Count": input.resultCount,
    "Imported Count": input.importedCount
  });
  return mapSearchRun(record);
}

export async function listFindings() {
  const records = await listRecords<AirtableFields>(tables.findings);
  return records.map(mapFinding);
}

export async function getFinding(findingId: string) {
  const record = await getRecord<AirtableFields>(tables.findings, findingId);
  return mapFinding(record);
}

export async function createFinding(input: Omit<Finding, "id">) {
  const record = await createRecord(tables.findings, {
    Title: input.title,
    URL: input.url,
    Source: input.source,
    Snippet: input.snippet,
    "Target Type": input.targetType,
    "Search Run": input.searchRunIds,
    "Candidate Name": input.candidateName,
    "Category Tags": input.categoryTags,
    Location: input.location,
    Decision: input.decision || undefined,
    "Decision Reason": input.decisionReason,
    "Matched Opportunity": input.matchedOpportunityIds,
    "Last Verified": input.lastVerified || undefined,
    "Structured Data": input.structuredData
  });
  return mapFinding(record);
}

export async function updateFinding(
  findingId: string,
  input: Partial<{
    decision: FindingDecision;
    decisionReason: string;
    matchedOpportunityIds: string[];
    structuredData: string;
  }>
) {
  const record = await updateRecord(tables.findings, findingId, {
    Decision: input.decision,
    "Decision Reason": input.decisionReason,
    "Matched Opportunity": input.matchedOpportunityIds,
    "Structured Data": input.structuredData
  });
  return mapFinding(record);
}

export async function listOpportunities() {
  const records = await listRecords<AirtableFields>(tables.opportunities);
  return records.map(mapOpportunity);
}

export async function getOpportunity(opportunityId: string) {
  const record = await getRecord<AirtableFields>(tables.opportunities, opportunityId);
  return mapOpportunity(record);
}

export async function createOpportunity(input: Omit<Opportunity, "id" | "lastActivityDate">) {
  const record = await createRecord(tables.opportunities, {
    Name: input.name,
    "Target Type": input.targetType,
    Stage: input.stage,
    "Fit Score": input.fitScore,
    Priority: input.priority,
    "Why Fit": input.whyFit,
    "Status Summary": input.statusSummary,
    "Primary Category": input.primaryCategory,
    "Category Tags": input.categoryTags,
    "Primary Contact": input.primaryContactIds,
    "Next Action": input.nextAction,
    "Next Follow-Up Date": input.nextFollowUpDate || undefined,
    Outcome: input.outcome,
    Owner: input.owner || getEnv().appOwner,
    "Open/Closed": input.openClosed,
    Profile: input.profileIds,
    "Related Findings": input.relatedFindingIds
  });
  return mapOpportunity(record);
}

export async function updateOpportunity(
  opportunityId: string,
  input: Partial<{
    stage: OpportunityStage;
    fitScore: number;
    priority: Priority;
    whyFit: string;
    statusSummary: string;
    nextAction: string;
    nextFollowUpDate: string;
    outcome: string;
    openClosed: "open" | "closed";
    primaryContactIds: string[];
  }>
) {
  const record = await updateRecord(tables.opportunities, opportunityId, {
    Stage: input.stage,
    "Fit Score": input.fitScore,
    Priority: input.priority,
    "Why Fit": input.whyFit,
    "Status Summary": input.statusSummary,
    "Next Action": input.nextAction,
    "Next Follow-Up Date": input.nextFollowUpDate || undefined,
    Outcome: input.outcome,
    "Open/Closed": input.openClosed,
    "Primary Contact": input.primaryContactIds
  });
  return mapOpportunity(record);
}

export async function listContacts() {
  const records = await listRecords<AirtableFields>(tables.contacts);
  return records.map(mapContact);
}

export async function getContact(contactId: string) {
  const record = await getRecord<AirtableFields>(tables.contacts, contactId);
  return mapContact(record);
}

export async function createContact(input: Omit<Contact, "id" | "lastContacted" | "lastReplyDate">) {
  const record = await createRecord(tables.contacts, {
    "Full Name": input.fullName,
    Role: input.role,
    "Organization/Lab": input.organizationLab,
    Opportunity: input.opportunityIds,
    Email: input.email,
    LinkedIn: input.linkedIn,
    "Contact Type": input.contactType || undefined,
    Primary: input.primary,
    Confidence: input.confidence,
    "Warm/Cold": input.warmCold || undefined,
    "Response Sentiment": input.responseSentiment || undefined,
    Notes: input.notes
  });
  return mapContact(record);
}

export async function listDrafts() {
  const records = await listRecords<AirtableFields>(tables.drafts);
  return records.map(mapDraft);
}

export async function createDraft(input: Omit<Draft, "id">) {
  const record = await createRecord(tables.drafts, {
    "Draft Title": input.draftTitle,
    Opportunity: input.opportunityIds,
    Contact: input.contactIds,
    Profile: input.profileIds,
    "Draft Type": input.draftType,
    Subject: input.subject,
    Body: input.body,
    "Personalization Hook": input.personalizationHook,
    "Call To Action": input.callToAction,
    Status: input.status,
    "Generated At": input.generatedAt,
    "Source Snapshot": input.sourceSnapshot,
    Version: input.version
  });
  return mapDraft(record);
}

export async function listOutreachEvents() {
  const records = await listRecords<AirtableFields>(tables.outreachEvents);
  return records.map(mapOutreachEvent);
}

export async function getOutreachEvent(eventId: string) {
  const record = await getRecord<AirtableFields>(tables.outreachEvents, eventId);
  return mapOutreachEvent(record);
}

export async function createOutreachEvent(input: Omit<OutreachEvent, "id">) {
  const record = await createRecord(tables.outreachEvents, {
    "Event Title": input.eventTitle,
    Opportunity: input.opportunityIds,
    Contact: input.contactIds,
    Draft: input.draftIds,
    "Event Type": input.eventType,
    "Event Date": input.eventDate,
    Channel: input.channel,
    Summary: input.summary,
    "Raw Reply": input.rawReply,
    "Outcome Change": input.outcomeChange,
    "Next Follow-Up Date": input.nextFollowUpDate || undefined
  });
  return mapOutreachEvent(record);
}

export async function createLabDetail(input: Omit<LabDetail, "id">) {
  const record = await createRecord(tables.labDetails, {
    "Detail Name": input.detailName,
    Opportunity: input.opportunityIds,
    University: input.university,
    Department: input.department,
    "Professor/PI": input.professorPi,
    "Lab Page": input.labPage,
    "Research Areas": input.researchAreas,
    Methods: input.methods,
    "Current Projects Summary": input.currentProjectsSummary,
    "Recent Publications/Topics": input.recentPublicationsTopics,
    "Undergrad Friendly": input.undergradFriendly,
    "Application Path": input.applicationPath,
    "Funding Signal": input.fundingSignal,
    "Manual Notes": input.manualNotes
  });
  return mapLabDetail(record);
}

export async function createStartupDetail(input: Omit<StartupDetail, "id">) {
  const record = await createRecord(tables.startupDetails, {
    "Detail Name": input.detailName,
    Opportunity: input.opportunityIds,
    "Company Site": input.companySite,
    "Crunchbase URL": input.crunchbaseUrl,
    Industry: input.industry,
    "Business Model": input.businessModel,
    "Funding Stage": input.fundingStage,
    "Total Funding": input.totalFunding,
    "Latest Round Type": input.latestRoundType,
    "Latest Round Date": input.latestRoundDate || undefined,
    "Hiring Signal": input.hiringSignal,
    "Careers Page": input.careersPage,
    "Relevant Roles": input.relevantRoles,
    HQ: input.hq,
    Remote: input.remote,
    Investors: input.investors,
    "Manual Notes": input.manualNotes
  });
  return mapStartupDetail(record);
}
