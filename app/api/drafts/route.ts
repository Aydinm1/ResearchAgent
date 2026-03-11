import { NextResponse } from "next/server";
import { listDrafts } from "@/lib/airtable/repositories";
import {
  jsonError,
  parseRequestBody,
  prefersJson,
  redirectWithFlash
} from "@/lib/http";
import { generateDraft } from "@/lib/services/drafts";
import { createDraftSchema } from "@/lib/validation";

export async function GET() {
  try {
    return NextResponse.json(await listDrafts());
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to load drafts.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseRequestBody(request, createDraftSchema);
    const draft = await generateDraft({
      opportunityId: body.opportunityId,
      contactId: body.contactId,
      profileId: body.profileId,
      draftType: body.draftType
    });
    if (prefersJson(request)) {
      return NextResponse.json(draft, { status: 201 });
    }
    return redirectWithFlash(request, `/opportunities/${body.opportunityId}`, {
      status: "success",
      message: "Draft generated."
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create draft.";
    if (prefersJson(request)) {
      return jsonError(message);
    }
    return redirectWithFlash(request, "/drafts", {
      status: "error",
      message
    });
  }
}
