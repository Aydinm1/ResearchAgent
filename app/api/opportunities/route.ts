import { NextResponse } from "next/server";
import { createOpportunity, listOpportunities } from "@/lib/airtable/repositories";
import { getEnv } from "@/lib/env";
import {
  jsonError,
  parseRequestBody,
  prefersJson,
  redirectWithFlash
} from "@/lib/http";
import { createOpportunitySchema } from "@/lib/validation";

export async function GET() {
  try {
    return NextResponse.json(await listOpportunities());
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to load opportunities.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseRequestBody(request, createOpportunitySchema);
    const opportunity = await createOpportunity({
      name: body.name,
      targetType: body.targetType,
      stage: body.stage,
      fitScore: body.fitScore,
      priority: body.priority,
      whyFit: body.whyFit,
      statusSummary: body.statusSummary,
      primaryCategory: body.primaryCategory,
      categoryTags: body.categoryTags,
      primaryContactIds: [],
      nextAction: body.nextAction,
      nextFollowUpDate: body.nextFollowUpDate,
      outcome: body.outcome,
      owner: getEnv().appOwner,
      openClosed: body.openClosed,
      profileIds: body.profileId ? [body.profileId] : [],
      relatedFindingIds: body.findingId ? [body.findingId] : []
    });
    if (prefersJson(request)) {
      return NextResponse.json(opportunity, { status: 201 });
    }
    return redirectWithFlash(request, `/opportunities/${opportunity.id}`, {
      status: "success",
      message: "Opportunity created."
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create opportunity.";
    if (prefersJson(request)) {
      return jsonError(message);
    }
    return redirectWithFlash(request, "/opportunities", {
      status: "error",
      message
    });
  }
}
