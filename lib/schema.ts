import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import type {
  AirtableAutomation,
  AirtableBaseSchema,
  AirtableTable
} from "@/lib/types";

const SCHEMA_PATH = path.join(process.cwd(), "airtable", "base-schema.json");

export const loadBaseSchema = cache((): AirtableBaseSchema => {
  const raw = fs.readFileSync(SCHEMA_PATH, "utf-8");
  return JSON.parse(raw) as AirtableBaseSchema;
});

export function getSchemaStats(schema: AirtableBaseSchema) {
  return {
    tableCount: schema.tables.length,
    fieldCount: schema.tables.reduce(
      (count, table) => count + table.fields.length,
      0
    ),
    viewCount: schema.recommended_views.length,
    automationCount: schema.recommended_automations.length
  };
}

export function getTableSummaries(schema: AirtableBaseSchema) {
  return schema.tables.map((table: AirtableTable) => ({
    name: table.name,
    description: table.description,
    primaryField: table.primary_field,
    fieldCount: table.fields.length
  }));
}

export function getAutomationSummaries(schema: AirtableBaseSchema) {
  return schema.recommended_automations.map(
    (automation: AirtableAutomation) => ({
      name: automation.name,
      trigger: automation.trigger,
      action: automation.action
    })
  );
}
