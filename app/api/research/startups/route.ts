import { NextResponse } from "next/server";
import {
  jsonError,
  parseRequestBody,
  prefersJson,
  redirectWithFlash
} from "@/lib/http";
import { runResearch } from "@/lib/services/research";
import { runResearchSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await parseRequestBody(request, runResearchSchema);
    const result = await runResearch({
      targetType: "startup",
      profileId: body.profileId,
      queryText: body.queryText,
      filtersUsed: body.filtersUsed,
      maxResults: body.maxResults || 6
    });
    if (prefersJson(request)) {
      return NextResponse.json(result, { status: 201 });
    }
    return redirectWithFlash(request, "/findings", {
      status: "success",
      message: `Startup research finished. Imported ${result.findings.length} findings.`
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to run startup research.";
    if (prefersJson(request)) {
      return jsonError(message);
    }
    return redirectWithFlash(request, "/search-runs", {
      status: "error",
      message
    });
  }
}
