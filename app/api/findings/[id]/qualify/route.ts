import { NextResponse } from "next/server";
import {
  jsonError,
  parseRequestBody,
  prefersJson,
  redirectWithFlash
} from "@/lib/http";
import { qualifyFinding } from "@/lib/services/research";
import { qualifyFindingSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await parseRequestBody(request, qualifyFindingSchema);
    const opportunity = await qualifyFinding({
      findingId: params.id || body.findingId,
      profileId: body.profileId,
      priority: body.priority,
      fitScore: body.fitScore
    });
    if (prefersJson(request)) {
      return NextResponse.json(opportunity, { status: 201 });
    }
    return redirectWithFlash(request, `/opportunities/${opportunity.id}`, {
      status: "success",
      message: "Finding qualified into an opportunity."
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to qualify finding.";
    if (prefersJson(request)) {
      return jsonError(message);
    }
    return redirectWithFlash(request, "/findings", {
      status: "error",
      message
    });
  }
}
