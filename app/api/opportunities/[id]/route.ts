import { NextResponse } from "next/server";
import { getOpportunity, updateOpportunity } from "@/lib/airtable/repositories";
import {
  jsonError,
  parseRequestBody,
  prefersJson,
  redirectWithFlash
} from "@/lib/http";
import { updateOpportunitySchema } from "@/lib/validation";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    return NextResponse.json(await getOpportunity(params.id));
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to load opportunity.", 500);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await parseRequestBody(request, updateOpportunitySchema);
    return NextResponse.json(
      await updateOpportunity(params.id, {
        stage: body.stage,
        priority: body.priority,
        whyFit: body.whyFit,
        statusSummary: body.statusSummary,
        nextAction: body.nextAction,
        nextFollowUpDate: body.nextFollowUpDate,
        outcome: body.outcome
      })
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to update opportunity.");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const body = await parseRequestBody(request, updateOpportunitySchema);
    const opportunity = await updateOpportunity(params.id, {
      stage: body.stage,
      priority: body.priority,
      whyFit: body.whyFit,
      statusSummary: body.statusSummary,
      nextAction: body.nextAction,
      nextFollowUpDate: body.nextFollowUpDate,
      outcome: body.outcome
    });
    if (prefersJson(request)) {
      return NextResponse.json(opportunity);
    }
    return redirectWithFlash(request, `/opportunities/${params.id}`, {
      status: "success",
      message: "Opportunity updated."
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update opportunity.";
    if (prefersJson(request)) {
      return jsonError(message);
    }
    return redirectWithFlash(request, `/opportunities/${params.id}`, {
      status: "error",
      message
    });
  }
}
