import schema from "@/airtable/base-schema.json";
import { GET as getFindings } from "@/app/api/findings/route";
import { GET as getOpportunities } from "@/app/api/opportunities/route";
import { GET as getProfiles } from "@/app/api/profiles/route";
import { GET as getSearchRuns, POST as postSearchRuns } from "@/app/api/search-runs/route";
import { getEnv } from "@/lib/env";
import { beforeAll, describe, expect, it } from "vitest";

type AirtableSchemaResponse = {
  tables: Array<{
    fields: Array<{
      name: string;
      type: string;
    }>;
    name: string;
  }>;
};

const liveEnabled = process.env.LIVE_AIRTABLE_TESTS === "true";
const writeEnabled = process.env.LIVE_AIRTABLE_WRITE_TESTS === "true";
const describeLive = liveEnabled ? describe : describe.skip;

async function getJsonErrorMessage(response: Response) {
  const payload = (await response.clone().json().catch(() => ({}))) as { error?: string };
  return payload.error || `Unexpected ${response.status} response`;
}

async function expectJsonArrayResponse(response: Response) {
  expect(response.status, await getJsonErrorMessage(response)).toBe(200);
  const payload = await response.json();
  expect(Array.isArray(payload)).toBe(true);
}

async function fetchAirtableSchema() {
  const env = getEnv();
  const response = await fetch(
    `https://api.airtable.com/v0/meta/bases/${env.airtableBaseId}/tables`,
    {
      headers: {
        Authorization: `Bearer ${env.airtableToken}`
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Unable to load Airtable base schema (${response.status}). ${text}`
    );
  }

  return (await response.json()) as AirtableSchemaResponse;
}

describeLive("live Airtable integration", () => {
  beforeAll(() => {
    const env = getEnv();
    expect(env.airtableBaseId, "AIRTABLE_BASE_ID is required for live Airtable tests").toBeTruthy();
    expect(env.airtableToken, "AIRTABLE_TOKEN is required for live Airtable tests").toBeTruthy();
  });

  it("matches required Airtable tables and fields", async () => {
    const airtableSchema = await fetchAirtableSchema();
    const actualTables = new Map(
      airtableSchema.tables.map((table) => [
        table.name,
        new Set(table.fields.map((field) => field.name))
      ])
    );

    const missingTables: string[] = [];
    const missingFields: string[] = [];

    for (const table of schema.tables) {
      const actualFields = actualTables.get(table.name);
      if (!actualFields) {
        missingTables.push(table.name);
        continue;
      }

      for (const field of table.fields) {
        if (!actualFields.has(field.name)) {
          missingFields.push(`${table.name}.${field.name}`);
        }
      }
    }

    expect(missingTables, `Missing Airtable tables: ${missingTables.join(", ")}`).toEqual([]);
    expect(missingFields, `Missing Airtable fields: ${missingFields.join(", ")}`).toEqual([]);
  });

  it("loads live profiles", async () => {
    await expectJsonArrayResponse(await getProfiles());
  });

  it("loads live search runs", async () => {
    await expectJsonArrayResponse(await getSearchRuns());
  });

  it("loads live findings", async () => {
    await expectJsonArrayResponse(await getFindings());
  });

  it("loads live opportunities", async () => {
    await expectJsonArrayResponse(await getOpportunities());
  });
});

(writeEnabled ? describe : describe.skip)("live Airtable write smoke", () => {
  it("creates a real search run through the route", async () => {
    const form = new FormData();
    form.set("runName", `[smoke] ${new Date().toISOString()}`);
    form.set("targetType", "lab");
    form.set("source", "manual");
    form.set("queryText", "Live write smoke test");
    form.set("filtersUsed", "");
    form.set("notes", "Temporary record created by LIVE_AIRTABLE_WRITE_TESTS");

    const response = await postSearchRuns(
      new Request("http://localhost/api/search-runs", {
        method: "POST",
        body: form
      })
    );

    expect(response.status, await getJsonErrorMessage(response)).toBe(303);
  });
});
