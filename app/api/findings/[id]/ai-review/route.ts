import { NextResponse } from "next/server";
import {
  jsonError,
  parseRequestBody,
  prefersJson,
  redirectWithFlash
} from "@/lib/http";
import { runAiReviewForFinding } from "@/lib/services/ai-review";
import { aiReviewFindingSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await parseRequestBody(request, aiReviewFindingSchema);
    const finding = await runAiReviewForFinding({
      findingId: params.id || body.findingId,
      profileId: body.profileId
    });

    if (prefersJson(request)) {
      return NextResponse.json(finding, { status: 201 });
    }

    return redirectWithFlash(request, "/findings", {
      status: "success",
      message: "AI review completed for the finding."
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to run AI review for the finding.";
    if (prefersJson(request)) {
      return jsonError(message);
    }
    return redirectWithFlash(request, "/findings", {
      status: "error",
      message
    });
  }
}
