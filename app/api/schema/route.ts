import { NextResponse } from "next/server";
import { loadBaseSchema } from "@/lib/schema";

export async function GET() {
  return NextResponse.json(loadBaseSchema());
}
