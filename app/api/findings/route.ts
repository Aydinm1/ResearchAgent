import { NextResponse } from "next/server";
import { listFindings } from "@/lib/airtable/repositories";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    return NextResponse.json(await listFindings());
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to load findings.", 500);
  }
}
