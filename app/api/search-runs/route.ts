import { NextResponse } from "next/server";
import { createSearchRun, listSearchRuns } from "@/lib/airtable/repositories";
import {
  jsonError,
  parseRequestBody,
  prefersJson,
  redirectWithFlash
} from "@/lib/http";
import { createSearchRunSchema } from "@/lib/validation";

export async function GET() {
  try {
    return NextResponse.json(await listSearchRuns());
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to load search runs.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseRequestBody(request, createSearchRunSchema);
    const searchRun = await createSearchRun({
      runName: body.runName,
      targetType: body.targetType,
      source: body.source,
      queryText: body.queryText,
      filtersUsed: body.filtersUsed,
      profileId: body.profileId,
      status: "queued",
      notes: body.notes
    });
    if (prefersJson(request)) {
      return NextResponse.json(searchRun, { status: 201 });
    }
    return redirectWithFlash(request, "/search-runs", {
      status: "success",
      message: "Search run created."
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create search run.";
    if (prefersJson(request)) {
      return jsonError(message);
    }
    return redirectWithFlash(request, "/search-runs", {
      status: "error",
      message
    });
  }
}
