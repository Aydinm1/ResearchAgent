import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "research-outreach-app",
    timestamp: new Date().toISOString()
  });
}
