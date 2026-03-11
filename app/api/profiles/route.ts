import { NextResponse } from "next/server";
import { createProfile, listProfiles } from "@/lib/airtable/repositories";
import {
  jsonError,
  prefersJson,
  redirectWithFlash
} from "@/lib/http";
import { extractCreateProfileInput } from "@/lib/services/profile-files";

export async function GET() {
  try {
    return NextResponse.json(await listProfiles());
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to load profiles.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await extractCreateProfileInput(request);
    const profile = await createProfile({
      profileName: body.profileName,
      school: body.school,
      majors: body.majors,
      year: body.year,
      resumeUrl: body.resumeUrl,
      interests: body.interests,
      skills: body.skills,
      projects: body.projects,
      preferredRoles: body.preferredRoles,
      locationPreference: body.locationPreference,
      availability: body.availability,
      personalizationNotes: body.personalizationNotes,
      active: body.active
    });
    if (prefersJson(request)) {
      return NextResponse.json(profile, { status: 201 });
    }
    return redirectWithFlash(request, "/profiles", {
      status: "success",
      message: "Profile saved."
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create profile.";
    if (prefersJson(request)) {
      return jsonError(message);
    }
    return redirectWithFlash(request, "/profiles", {
      status: "error",
      message
    });
  }
}
