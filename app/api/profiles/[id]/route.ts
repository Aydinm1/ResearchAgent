import { NextResponse } from "next/server";
import { getProfile, updateProfile } from "@/lib/airtable/repositories";
import {
  jsonError,
  prefersJson,
  redirectWithFlash
} from "@/lib/http";
import { extractUpdateProfileInput } from "@/lib/services/profile-files";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    return NextResponse.json(await getProfile(params.id));
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to load profile.", 500);
  }
}

async function handleUpdate(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const existing = await getProfile(params.id);
    const body = await extractUpdateProfileInput(request, existing.resumeUrl);
    const profile = await updateProfile(params.id, {
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
      return NextResponse.json(profile);
    }

    return redirectWithFlash(request, "/profiles", {
      status: "success",
      message: "Profile updated."
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update profile.";
    if (prefersJson(request)) {
      return jsonError(message);
    }
    return redirectWithFlash(request, "/profiles", {
      status: "error",
      message
    });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, context);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, context);
}
