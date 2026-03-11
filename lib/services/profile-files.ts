import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createProfileSchema, updateProfileSchema } from "@/lib/validation";

type ProfileInput = {
  profileName: string;
  school: string;
  majors: string[];
  year: string;
  resumeUrl: string;
  interests: string;
  skills: string;
  projects: string;
  preferredRoles: string;
  locationPreference: string;
  availability: string;
  personalizationNotes: string;
  active: boolean;
};

function sanitizeFilename(filename: string) {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

async function saveResumeFile(file: File) {
  const filename = sanitizeFilename(file.name || "resume.pdf");
  const extension = path.extname(filename) || ".pdf";
  const finalName = `${Date.now()}-${randomUUID()}${extension}`;
  const directory = path.join(process.cwd(), "public", "uploads", "resumes");
  const filePath = path.join(directory, finalName);

  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  return `/uploads/resumes/${finalName}`;
}

function assertPdf(file: File) {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    throw new Error("Resume upload must be a PDF.");
  }
}

export async function extractCreateProfileInput(request: Request): Promise<ProfileInput> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = createProfileSchema.parse(await request.json());
    return body;
  }

  const formData = await request.formData();
  const resumeFile = formData.get("resumeFile");
  const raw = Object.fromEntries(
    [...formData.entries()].filter(([key]) => key !== "resumeFile")
  );
  const parsed = createProfileSchema.parse(raw);

  if (resumeFile instanceof File && resumeFile.size > 0) {
    assertPdf(resumeFile);
    parsed.resumeUrl = await saveResumeFile(resumeFile);
  }

  return parsed;
}

export async function extractUpdateProfileInput(
  request: Request,
  existingResumeUrl: string
): Promise<ProfileInput & { profileId: string }> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = updateProfileSchema.parse(await request.json());
    return body;
  }

  const formData = await request.formData();
  const resumeFile = formData.get("resumeFile");
  const raw = Object.fromEntries(
    [...formData.entries()].filter(([key]) => key !== "resumeFile")
  );
  const parsed = updateProfileSchema.parse(raw);

  if (resumeFile instanceof File && resumeFile.size > 0) {
    assertPdf(resumeFile);
    parsed.resumeUrl = await saveResumeFile(resumeFile);
  } else if (!parsed.resumeUrl) {
    parsed.resumeUrl = existingResumeUrl;
  }

  return parsed;
}
