import { NextResponse } from "next/server";
import { listOutreachEvents } from "@/lib/airtable/repositories";
import {
  jsonError,
  parseRequestBody,
  prefersJson,
  redirectWithFlash
} from "@/lib/http";
import { logOutreachEvent } from "@/lib/services/drafts";
import { createOutreachEventSchema } from "@/lib/validation";

export async function GET() {
  try {
    return NextResponse.json(await listOutreachEvents());
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to load outreach events.",
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseRequestBody(request, createOutreachEventSchema);
    const event = await logOutreachEvent({
      opportunityId: body.opportunityId,
      contactId: body.contactId,
      draftId: body.draftId,
      eventType: body.eventType,
      eventDate: body.eventDate,
      channel: body.channel,
      summary: body.summary,
      rawReply: body.rawReply,
      outcomeChange: body.outcomeChange,
      nextFollowUpDate: body.nextFollowUpDate
    });
    if (prefersJson(request)) {
      return NextResponse.json(event, { status: 201 });
    }
    return redirectWithFlash(request, `/opportunities/${body.opportunityId}`, {
      status: "success",
      message: "Outreach event logged."
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to log outreach event.";
    if (prefersJson(request)) {
      return jsonError(message);
    }
    return redirectWithFlash(request, "/opportunities", {
      status: "error",
      message
    });
  }
}
