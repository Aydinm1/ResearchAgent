import { NextResponse } from "next/server";
import {
  jsonError,
  parseRequestBody,
  prefersJson,
  redirectWithFlash
} from "@/lib/http";
import { runAiReviewBatch } from "@/lib/services/ai-review";
import { aiReviewBatchSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await parseRequestBody(request, aiReviewBatchSchema);
    const findings = await runAiReviewBatch({
      findingIds: body.findingIds,
      profileId: body.profileId
    });

    if (prefersJson(request)) {
      return NextResponse.json(findings, { status: 201 });
    }

    return redirectWithFlash(request, "/findings", {
      status: "success",
      message: `AI review completed for ${findings.length} findings.`
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to run batch AI review.";
    if (prefersJson(request)) {
      return jsonError(message);
    }
    return redirectWithFlash(request, "/findings", {
      status: "error",
      message
    });
  }
}
