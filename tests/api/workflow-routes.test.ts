import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/airtable/repositories", () => ({
  listContacts: vi.fn(),
  createContact: vi.fn(),
  getSearchRun: vi.fn(),
  updateOpportunity: vi.fn(),
  listDrafts: vi.fn(),
  listOutreachEvents: vi.fn(),
  listFindings: vi.fn(),
  listOpportunities: vi.fn(),
  listSearchRuns: vi.fn()
}));

vi.mock("@/lib/services/drafts", () => ({
  generateDraft: vi.fn(),
  logOutreachEvent: vi.fn()
}));

vi.mock("@/lib/services/research", () => ({
  qualifyFinding: vi.fn(),
  startResearchRun: vi.fn(),
  executeResearchRun: vi.fn(),
  runResearch: vi.fn()
}));

import {
  createContact,
  getSearchRun,
  listContacts,
  listDrafts,
  listFindings,
  listOpportunities,
  listOutreachEvents,
  listSearchRuns,
  updateOpportunity
} from "@/lib/airtable/repositories";
import { generateDraft, logOutreachEvent } from "@/lib/services/drafts";
import {
  executeResearchRun,
  qualifyFinding,
  startResearchRun
} from "@/lib/services/research";
import { GET as getContacts, POST as postContacts } from "@/app/api/contacts/route";
import { GET as getDrafts, POST as postDrafts } from "@/app/api/drafts/route";
import { GET as getFindings } from "@/app/api/findings/route";
import { POST as postQualifyFinding } from "@/app/api/findings/[id]/qualify/route";
import { GET as getOpportunities } from "@/app/api/opportunities/route";
import {
  GET as getOutreachEvents,
  POST as postOutreachEvents
} from "@/app/api/outreach-events/route";
import { POST as postLabResearch } from "@/app/api/research/labs/route";
import { POST as postStartupResearch } from "@/app/api/research/startups/route";
import { GET as getSearchRuns } from "@/app/api/search-runs/route";
import { GET as getSearchRunDetail } from "@/app/api/search-runs/[id]/route";

describe("workflow endpoints", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("lists contacts", async () => {
    vi.mocked(listContacts).mockResolvedValue([
      {
        id: "contact_1",
        fullName: "Ada Lovelace",
        role: "Founder",
        organizationLab: "Startup",
        opportunityIds: ["opp_1"],
        email: "ada@example.com",
        linkedIn: "",
        contactType: "founder",
        primary: true,
        confidence: 90,
        warmCold: "cold",
        lastContacted: "",
        lastReplyDate: "",
        responseSentiment: "",
        notes: ""
      }
    ]);

    const response = await getContacts();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload[0].fullName).toBe("Ada Lovelace");
  });

  it("creates a contact and sets it as primary", async () => {
    vi.mocked(createContact).mockResolvedValue({
      id: "contact_1",
      fullName: "Ada Lovelace",
      role: "Founder",
      organizationLab: "Startup",
      opportunityIds: ["opp_1"],
      email: "ada@example.com",
      linkedIn: "",
      contactType: "founder",
      primary: true,
      confidence: 90,
      warmCold: "cold",
      lastContacted: "",
      lastReplyDate: "",
      responseSentiment: "",
      notes: ""
    });
    vi.mocked(updateOpportunity).mockResolvedValue({} as never);

    const form = new FormData();
    form.set("fullName", "Ada Lovelace");
    form.set("opportunityId", "opp_1");
    form.set("primary", "true");

    const response = await postContacts(
      new Request("http://localhost/api/contacts?redirectTo=/opportunities/opp_1", {
        method: "POST",
        body: form
      })
    );

    expect(response.status).toBe(303);
    expect(vi.mocked(updateOpportunity)).toHaveBeenCalledWith("opp_1", {
      primaryContactIds: ["contact_1"]
    });
  });

  it("lists drafts", async () => {
    vi.mocked(listDrafts).mockResolvedValue([
      {
        id: "draft_1",
        draftTitle: "Draft",
        opportunityIds: ["opp_1"],
        contactIds: ["contact_1"],
        profileIds: ["prof_1"],
        draftType: "initial",
        subject: "Hello",
        body: "Body",
        personalizationHook: "",
        callToAction: "",
        status: "ready",
        generatedAt: new Date().toISOString(),
        sourceSnapshot: "",
        version: 1
      }
    ]);

    const response = await getDrafts();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload[0].draftTitle).toBe("Draft");
  });

  it("creates a draft", async () => {
    vi.mocked(generateDraft).mockResolvedValue({
      id: "draft_1",
      draftTitle: "Draft",
      opportunityIds: ["opp_1"],
      contactIds: ["contact_1"],
      profileIds: ["prof_1"],
      draftType: "initial",
      subject: "Hello",
      body: "Body",
      personalizationHook: "",
      callToAction: "",
      status: "ready",
      generatedAt: new Date().toISOString(),
      sourceSnapshot: "",
      version: 1
    });

    const form = new FormData();
    form.set("opportunityId", "opp_1");
    form.set("contactId", "contact_1");
    form.set("profileId", "prof_1");
    form.set("draftType", "initial");

    const response = await postDrafts(
      new Request("http://localhost/api/drafts?redirectTo=/opportunities/opp_1", {
        method: "POST",
        body: form
      })
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("status=success");
  });

  it("lists findings", async () => {
    vi.mocked(listFindings).mockResolvedValue([
      {
        id: "finding_1",
        title: "Lab",
        url: "https://example.com/lab",
        source: "google",
        snippet: "Snippet",
        targetType: "lab",
        searchRunIds: ["run_1"],
        candidateName: "Vision Lab",
        categoryTags: ["ai_ml"],
        location: "Davis",
        decision: "new",
        decisionReason: "",
        matchedOpportunityIds: [],
        lastVerified: new Date().toISOString(),
        structuredData: "{}"
      }
    ]);

    const response = await getFindings();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload[0].candidateName).toBe("Vision Lab");
  });

  it("qualifies a finding", async () => {
    vi.mocked(qualifyFinding).mockResolvedValue({
      id: "opp_1",
      name: "Vision Lab",
      targetType: "lab",
      stage: "qualified",
      fitScore: 90,
      priority: "high",
      whyFit: "",
      statusSummary: "",
      primaryCategory: "",
      categoryTags: [],
      primaryContactIds: [],
      nextAction: "",
      nextFollowUpDate: "",
      lastActivityDate: "",
      outcome: "",
      owner: "Owner",
      profileIds: [],
      relatedFindingIds: ["finding_1"]
    });

    const form = new FormData();
    form.set("findingId", "finding_1");
    form.set("fitScore", "90");
    form.set("priority", "high");

    const response = await postQualifyFinding(
      new Request(
        "http://localhost/api/findings/finding_1/qualify?redirectTo=/opportunities/opp_1",
        {
          method: "POST",
          body: form
        }
      ),
      { params: Promise.resolve({ id: "finding_1" }) }
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("status=success");
  });

  it("lists opportunities", async () => {
    vi.mocked(listOpportunities).mockResolvedValue([
      {
        id: "opp_1",
        name: "Vision Lab",
        targetType: "lab",
        stage: "qualified",
        fitScore: 90,
        priority: "high",
        whyFit: "",
        statusSummary: "",
        primaryCategory: "",
        categoryTags: [],
        primaryContactIds: [],
        nextAction: "",
        nextFollowUpDate: "",
        lastActivityDate: "",
        outcome: "",
        owner: "Owner",
        profileIds: [],
        relatedFindingIds: []
      }
    ]);

    const response = await getOpportunities();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload[0].name).toBe("Vision Lab");
  });

  it("lists outreach events", async () => {
    vi.mocked(listOutreachEvents).mockResolvedValue([
      {
        id: "event_1",
        eventTitle: "sent",
        opportunityIds: ["opp_1"],
        contactIds: ["contact_1"],
        draftIds: ["draft_1"],
        eventType: "sent",
        eventDate: new Date().toISOString(),
        channel: "email",
        summary: "Sent email",
        rawReply: "",
        outcomeChange: "",
        nextFollowUpDate: ""
      }
    ]);

    const response = await getOutreachEvents();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload[0].eventType).toBe("sent");
  });

  it("creates an outreach event", async () => {
    vi.mocked(logOutreachEvent).mockResolvedValue({
      id: "event_1",
      eventTitle: "sent",
      opportunityIds: ["opp_1"],
      contactIds: ["contact_1"],
      draftIds: ["draft_1"],
      eventType: "sent",
      eventDate: new Date().toISOString(),
      channel: "email",
      summary: "Sent email",
      rawReply: "",
      outcomeChange: "",
      nextFollowUpDate: ""
    });

    const form = new FormData();
    form.set("opportunityId", "opp_1");
    form.set("contactId", "contact_1");
    form.set("draftId", "draft_1");
    form.set("eventType", "sent");
    form.set("channel", "email");

    const response = await postOutreachEvents(
      new Request(
        "http://localhost/api/outreach-events?redirectTo=/opportunities/opp_1",
        {
          method: "POST",
          body: form
        }
      )
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("status=success");
  });

  it("lists search runs", async () => {
    vi.mocked(listSearchRuns).mockResolvedValue([
      {
        id: "run_1",
        runName: "Lab Search",
        targetType: "lab",
        source: "manual",
        queryText: "labs",
        filtersUsed: "",
        profileIds: ["prof_1"],
        runDate: new Date().toISOString(),
        status: "completed",
        notes: "",
        resultCount: 3,
        importedCount: 3
      }
    ]);

    const response = await getSearchRuns();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload[0].runName).toBe("Lab Search");
  });

  it("loads a single search run with linked findings", async () => {
    vi.mocked(getSearchRun).mockResolvedValue({
      id: "run_1",
      runName: "Lab Search",
      targetType: "lab",
      source: "manual",
      queryText: "labs",
      filtersUsed: "",
      profileIds: ["prof_1"],
      runDate: new Date().toISOString(),
      status: "running",
      notes: "Sending research prompt to OpenAI with web search enabled.",
      resultCount: 0,
      importedCount: 0
    });
    vi.mocked(listFindings).mockResolvedValue([
      {
        id: "finding_1",
        title: "Lab",
        url: "https://example.com/lab",
        source: "google",
        snippet: "Snippet",
        targetType: "lab",
        searchRunIds: ["run_1"],
        candidateName: "Vision Lab",
        categoryTags: ["ai_ml"],
        location: "Davis",
        decision: "new",
        decisionReason: "",
        matchedOpportunityIds: [],
        lastVerified: new Date().toISOString(),
        structuredData: "{}"
      }
    ]);

    const response = await getSearchRunDetail(
      new Request("http://localhost/api/search-runs/run_1"),
      { params: Promise.resolve({ id: "run_1" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.searchRun.id).toBe("run_1");
    expect(payload.findings).toHaveLength(1);
  });

  it("runs lab research", async () => {
    vi.mocked(startResearchRun).mockResolvedValue({
      id: "run_1",
      runName: "Lab Search",
      targetType: "lab",
      source: "manual",
      queryText: "labs",
      filtersUsed: "",
      profileIds: ["prof_1"],
      runDate: new Date().toISOString(),
      status: "running",
      notes: "",
      resultCount: 0,
      importedCount: 0
    });
    vi.mocked(executeResearchRun).mockResolvedValue([]);

    const form = new FormData();
    form.set("profileId", "prof_1");
    form.set("queryText", "labs");
    form.set("maxResults", "5");

    const response = await postLabResearch(
      new Request("http://localhost/api/research/labs?redirectTo=/findings", {
        method: "POST",
        body: form
      })
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("status=success");
    expect(vi.mocked(startResearchRun)).toHaveBeenCalled();
  });

  it("runs startup research", async () => {
    vi.mocked(startResearchRun).mockResolvedValue({
      id: "run_2",
      runName: "Startup Search",
      targetType: "startup",
      source: "manual",
      queryText: "startups",
      filtersUsed: "",
      profileIds: ["prof_1"],
      runDate: new Date().toISOString(),
      status: "running",
      notes: "",
      resultCount: 0,
      importedCount: 0
    });
    vi.mocked(executeResearchRun).mockResolvedValue([]);

    const form = new FormData();
    form.set("profileId", "prof_1");
    form.set("queryText", "startups");
    form.set("maxResults", "5");

    const response = await postStartupResearch(
      new Request(
        "http://localhost/api/research/startups?redirectTo=/findings",
        {
          method: "POST",
          body: form
        }
      )
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("status=success");
    expect(vi.mocked(startResearchRun)).toHaveBeenCalled();
  });
});
