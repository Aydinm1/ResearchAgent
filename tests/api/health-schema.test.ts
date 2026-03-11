import { describe, expect, it } from "vitest";
import { GET as getHealth } from "@/app/api/health/route";
import { GET as getSchema } from "@/app/api/schema/route";

describe("health and schema endpoints", () => {
  it("returns health payload", async () => {
    const response = await getHealth();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("ok");
    expect(payload.service).toBe("research-outreach-app");
  });

  it("returns the airtable schema", async () => {
    const response = await getSchema();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.base_name).toBe("Research Outreach CRM");
    expect(Array.isArray(payload.tables)).toBe(true);
  });
});
