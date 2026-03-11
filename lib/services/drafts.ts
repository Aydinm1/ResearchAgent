import {
  createDraft,
  createOutreachEvent,
  getOpportunity,
  getProfile,
  listContacts,
  listDrafts,
  updateOpportunity
} from "@/lib/airtable/repositories";
import { createOpenAiResponse } from "@/lib/openai";
import type { DraftType, OutreachEventType } from "@/lib/types";
import { parseJsonBlock } from "@/lib/utils";

function buildDraftPrompt(input: {
  draftType: DraftType;
  opportunityName: string;
  targetType: string;
  profileSummary: string;
  contactName: string;
  contactRole: string;
  whyFit: string;
  sourceSnapshot: string;
}) {
  return `
Write a concise outreach email as JSON with keys subject, body, personalizationHook, callToAction.
Do not invent experience, publications, or relationships.
Keep the tone direct, thoughtful, and editable by the user.

Draft type: ${input.draftType}
Target type: ${input.targetType}
Target name: ${input.opportunityName}
Contact: ${input.contactName} (${input.contactRole})
Why this is a fit: ${input.whyFit}
Profile:
${input.profileSummary}

Source context:
${input.sourceSnapshot}
`;
}

export async function generateDraft(input: {
  opportunityId: string;
  contactId: string;
  profileId: string;
  draftType: DraftType;
}) {
  const [opportunity, profile, contacts, drafts] = await Promise.all([
    getOpportunity(input.opportunityId),
    getProfile(input.profileId),
    listContacts(),
    listDrafts()
  ]);
  const contact = contacts.find((item) => item.id === input.contactId);
  if (!contact) {
    throw new Error("Contact not found.");
  }

  const profileSummary = [
    `School: ${profile.school}`,
    `Majors: ${profile.majors.join(", ")}`,
    `Year: ${profile.year}`,
    `Interests: ${profile.interests}`,
    `Skills: ${profile.skills}`,
    `Projects: ${profile.projects}`,
    `Preferred roles: ${profile.preferredRoles}`
  ].join("\n");

  const raw = await createOpenAiResponse({
    prompt: buildDraftPrompt({
      draftType: input.draftType,
      opportunityName: opportunity.name,
      targetType: opportunity.targetType,
      profileSummary,
      contactName: contact.fullName,
      contactRole: contact.role,
      whyFit: opportunity.whyFit,
      sourceSnapshot: opportunity.statusSummary
    })
  });

  const parsed = parseJsonBlock<{
    subject: string;
    body: string;
    personalizationHook: string;
    callToAction: string;
  }>(raw, {
    subject: "",
    body: "",
    personalizationHook: "",
    callToAction: ""
  });

  const version =
    drafts.filter((draft) => draft.opportunityIds.includes(opportunity.id)).length + 1;

  const draft = await createDraft({
    draftTitle: `${opportunity.name} ${input.draftType} draft v${version}`,
    opportunityIds: [opportunity.id],
    contactIds: [contact.id],
    profileIds: [profile.id],
    draftType: input.draftType,
    subject: parsed.subject,
    body: parsed.body,
    personalizationHook: parsed.personalizationHook,
    callToAction: parsed.callToAction,
    status: "ready",
    generatedAt: new Date().toISOString(),
    sourceSnapshot: opportunity.statusSummary,
    version
  });

  await createOutreachEvent({
    eventTitle: `${opportunity.name} draft created`,
    opportunityIds: [opportunity.id],
    contactIds: [contact.id],
    draftIds: [draft.id],
    eventType: "draft_created",
    eventDate: new Date().toISOString(),
    channel: "email",
    summary: `Generated ${input.draftType} draft.`,
    rawReply: "",
    outcomeChange: "",
    nextFollowUpDate: ""
  });

  await updateOpportunity(opportunity.id, {
    stage: "draft_ready",
    nextAction: "Review draft and send manually."
  });

  return draft;
}

export async function logOutreachEvent(input: {
  opportunityId: string;
  contactId?: string;
  draftId?: string;
  eventType: OutreachEventType;
  eventDate: string;
  channel: "email" | "linkedin" | "manual_note";
  summary: string;
  rawReply: string;
  outcomeChange: string;
  nextFollowUpDate: string;
}) {
  const event = await createOutreachEvent({
    eventTitle: `${input.eventType} - ${new Date().toLocaleDateString("en-US")}`,
    opportunityIds: [input.opportunityId],
    contactIds: input.contactId ? [input.contactId] : [],
    draftIds: input.draftId ? [input.draftId] : [],
    eventType: input.eventType,
    eventDate: input.eventDate || new Date().toISOString(),
    channel: input.channel,
    summary: input.summary,
    rawReply: input.rawReply,
    outcomeChange: input.outcomeChange,
    nextFollowUpDate: input.nextFollowUpDate
  });

  const followUpDate =
    input.nextFollowUpDate ||
    (input.eventType === "sent" || input.eventType === "follow_up_sent"
      ? new Date(
          Date.now() + 1000 * 60 * 60 * 24 * 7
        ).toISOString()
      : "");

  const stageMap: Partial<Record<OutreachEventType, string>> = {
    sent: "sent",
    follow_up_sent: "follow_up_due",
    reply_received: "replied_neutral",
    rejected: "closed",
    meeting_requested: "replied_positive",
    no_response_closed: "closed"
  };

  await updateOpportunity(input.opportunityId, {
    stage: stageMap[input.eventType] as never,
    nextFollowUpDate: followUpDate,
    outcome:
      input.eventType === "rejected" || input.eventType === "no_response_closed"
        ? "closed"
        : input.outcomeChange === "closed"
          ? "closed"
          : "open",
    nextAction:
      input.eventType === "meeting_requested"
        ? "Schedule meeting."
        : input.eventType === "reply_received"
          ? "Review response and reply."
          : "Track thread."
  });

  return event;
}
