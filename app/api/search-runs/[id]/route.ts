import { NextResponse } from "next/server";
import { getSearchRun, listFindings } from "@/lib/airtable/repositories";
import { jsonError } from "@/lib/http";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [searchRun, findings] = await Promise.all([
      getSearchRun(id),
      listFindings()
    ]);

    return NextResponse.json({
      searchRun,
      findings: findings.filter((finding) => finding.searchRunIds.includes(id))
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to load search run.",
      500
    );
  }
}
