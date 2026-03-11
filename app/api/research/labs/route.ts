import { NextResponse } from "next/server";
import {
  jsonError,
  parseRequestBody,
  prefersJson,
  redirectWithFlash,
  scheduleAfterResponse
} from "@/lib/http";
import { executeResearchRun, startResearchRun } from "@/lib/services/research";
import { runResearchSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await parseRequestBody(request, runResearchSchema);
    const searchRun = await startResearchRun({
      targetType: "lab",
      profileId: body.profileId,
      queryText: body.queryText,
      filtersUsed: body.filtersUsed,
      maxResults: body.maxResults || 6
    });
    scheduleAfterResponse(async () => {
      await executeResearchRun({
        targetType: "lab",
        profileId: body.profileId,
        queryText: body.queryText,
        filtersUsed: body.filtersUsed,
        maxResults: body.maxResults || 6,
        searchRunId: searchRun.id
      }).catch(() => undefined);
    });
    if (prefersJson(request)) {
      return NextResponse.json(
        {
          searchRun,
          message: "Lab research started. Live updates will stream automatically."
        },
        { status: 202 }
      );
    }
    return redirectWithFlash(request, "/search-runs", {
      status: "success",
      message: "Lab research started. Live updates will stream automatically."
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to run lab research.";
    if (prefersJson(request)) {
      return jsonError(message);
    }
    return redirectWithFlash(request, "/search-runs", {
      status: "error",
      message
    });
  }
}
