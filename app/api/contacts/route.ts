import { NextResponse } from "next/server";
import {
  createContact,
  listContacts,
  updateOpportunity
} from "@/lib/airtable/repositories";
import {
  jsonError,
  parseRequestBody,
  prefersJson,
  redirectWithFlash
} from "@/lib/http";
import { createContactSchema } from "@/lib/validation";

export async function GET() {
  try {
    return NextResponse.json(await listContacts());
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to load contacts.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseRequestBody(request, createContactSchema);
    const contact = await createContact({
      fullName: body.fullName,
      role: body.role,
      organizationLab: body.organizationLab,
      opportunityIds: [body.opportunityId],
      email: body.email,
      linkedIn: body.linkedIn,
      contactType: body.contactType as never,
      primary: body.primary,
      confidence: body.confidence,
      warmCold: body.warmCold as never,
      responseSentiment: "",
      notes: body.notes
    });
    if (body.primary) {
      await updateOpportunity(body.opportunityId, {
        primaryContactIds: [contact.id]
      });
    }
    if (prefersJson(request)) {
      return NextResponse.json(contact, { status: 201 });
    }
    return redirectWithFlash(request, `/opportunities/${body.opportunityId}`, {
      status: "success",
      message: "Contact added."
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create contact.";
    if (prefersJson(request)) {
      return jsonError(message);
    }
    return redirectWithFlash(request, "/opportunities", {
      status: "error",
      message
    });
  }
}
