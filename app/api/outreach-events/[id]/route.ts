import { NextResponse } from "next/server";
import { getOutreachEvent } from "@/lib/airtable/repositories";
import { jsonError } from "@/lib/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    return NextResponse.json(await getOutreachEvent(params.id));
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to load outreach event.",
      500
    );
  }
}
