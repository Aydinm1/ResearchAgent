import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/airtable/repositories", () => ({
  listProfiles: vi.fn(),
  createProfile: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn()
}));

vi.mock("@/lib/services/profile-files", () => ({
  extractCreateProfileInput: vi.fn(),
  extractUpdateProfileInput: vi.fn()
}));

import {
  createProfile,
  getProfile,
  listProfiles,
  updateProfile
} from "@/lib/airtable/repositories";
import {
  extractCreateProfileInput,
  extractUpdateProfileInput
} from "@/lib/services/profile-files";
import { GET as getProfiles, POST as postProfiles } from "@/app/api/profiles/route";
import {
  GET as getProfileById,
  POST as postProfileById
} from "@/app/api/profiles/[id]/route";

describe("profile endpoints", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("lists profiles", async () => {
    vi.mocked(listProfiles).mockResolvedValue([
      {
        id: "prof_1",
        profileName: "Main Profile",
        school: "UC Davis",
        majors: ["Cognitive Science", "Computer Science"],
        year: "Junior",
        resumeUrl: "",
        interests: "",
        skills: "",
        projects: "",
        preferredRoles: "",
        locationPreference: "",
        availability: "",
        personalizationNotes: "",
        active: true
      }
    ]);

    const response = await getProfiles();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toHaveLength(1);
    expect(payload[0].profileName).toBe("Main Profile");
  });

  it("creates a profile and redirects with success", async () => {
    vi.mocked(extractCreateProfileInput).mockResolvedValue({
      profileName: "New Profile",
      school: "UC Davis",
      majors: ["Cognitive Science"],
      year: "Sophomore",
      resumeUrl: "/uploads/resumes/resume.pdf",
      interests: "AI",
      skills: "",
      projects: "",
      preferredRoles: "",
      locationPreference: "",
      availability: "",
      personalizationNotes: "",
      active: true
    });
    vi.mocked(createProfile).mockResolvedValue({
      id: "prof_2",
      profileName: "New Profile",
      school: "UC Davis",
      majors: ["Cognitive Science"],
      year: "Sophomore",
      resumeUrl: "/uploads/resumes/resume.pdf",
      interests: "AI",
      skills: "",
      projects: "",
      preferredRoles: "",
      locationPreference: "",
      availability: "",
      personalizationNotes: "",
      active: true
    });

    const form = new FormData();
    form.set("profileName", "New Profile");
    const request = new Request("http://localhost/api/profiles?redirectTo=/profiles", {
      method: "POST",
      body: form
    });

    const response = await postProfiles(request);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/profiles");
    expect(response.headers.get("location")).toContain("status=success");
  });

  it("loads a profile by id", async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: "prof_1",
      profileName: "Main Profile",
      school: "UC Davis",
      majors: ["Cognitive Science", "Computer Science"],
      year: "Junior",
      resumeUrl: "",
      interests: "",
      skills: "",
      projects: "",
      preferredRoles: "",
      locationPreference: "",
      availability: "",
      personalizationNotes: "",
      active: true
    });

    const response = await getProfileById(new Request("http://localhost"), {
      params: Promise.resolve({ id: "prof_1" })
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.id).toBe("prof_1");
  });

  it("updates a profile and redirects with success", async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: "prof_1",
      profileName: "Main Profile",
      school: "UC Davis",
      majors: ["Cognitive Science", "Computer Science"],
      year: "Junior",
      resumeUrl: "/uploads/resumes/old.pdf",
      interests: "",
      skills: "",
      projects: "",
      preferredRoles: "",
      locationPreference: "",
      availability: "",
      personalizationNotes: "",
      active: true
    });
    vi.mocked(extractUpdateProfileInput).mockResolvedValue({
      profileId: "prof_1",
      profileName: "Updated Profile",
      school: "UC Davis",
      majors: ["Computer Science"],
      year: "Senior",
      resumeUrl: "/uploads/resumes/new.pdf",
      interests: "ML",
      skills: "",
      projects: "",
      preferredRoles: "",
      locationPreference: "",
      availability: "",
      personalizationNotes: "",
      active: true
    });
    vi.mocked(updateProfile).mockResolvedValue({
      id: "prof_1",
      profileName: "Updated Profile",
      school: "UC Davis",
      majors: ["Computer Science"],
      year: "Senior",
      resumeUrl: "/uploads/resumes/new.pdf",
      interests: "ML",
      skills: "",
      projects: "",
      preferredRoles: "",
      locationPreference: "",
      availability: "",
      personalizationNotes: "",
      active: true
    });

    const form = new FormData();
    form.set("profileId", "prof_1");
    form.set("profileName", "Updated Profile");
    const request = new Request(
      "http://localhost/api/profiles/prof_1?redirectTo=/profiles/prof_1",
      {
        method: "POST",
        body: form
      }
    );

    const response = await postProfileById(request, {
      params: Promise.resolve({ id: "prof_1" })
    });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/profiles/prof_1");
    expect(response.headers.get("location")).toContain("status=success");
  });
});
