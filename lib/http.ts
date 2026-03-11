import { after, NextResponse } from "next/server";
import { z } from "zod";

export async function parseRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return schema.parse(await request.json());
  }

  const formData = await request.formData();
  const raw = Object.fromEntries(formData.entries());
  return schema.parse(raw);
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function getRedirectUrl(request: Request, fallback: string) {
  const url = new URL(request.url);
  const redirect = url.searchParams.get("redirectTo") || fallback;
  return new URL(redirect, request.url);
}

export function redirectTo(request: Request, fallback: string) {
  return NextResponse.redirect(getRedirectUrl(request, fallback), { status: 303 });
}

export function redirectWithFlash(
  request: Request,
  fallback: string,
  input: { status: "success" | "error"; message: string }
) {
  const redirectUrl = getRedirectUrl(request, fallback);
  redirectUrl.searchParams.set("status", input.status);
  redirectUrl.searchParams.set("message", input.message);
  return NextResponse.redirect(redirectUrl, { status: 303 });
}

export function prefersJson(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  return contentType.includes("application/json");
}

export function scheduleAfterResponse(task: () => Promise<void> | void) {
  try {
    after(async () => {
      await task();
    });
  } catch {
    queueMicrotask(() => {
      void Promise.resolve(task()).catch(() => undefined);
    });
  }
}
