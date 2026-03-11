import { assertAirtableConfig } from "@/lib/env";

type AirtableRecord<TFields> = {
  id: string;
  createdTime: string;
  fields: TFields;
};

type ListResponse<TFields> = {
  records: AirtableRecord<TFields>[];
  offset?: string;
};

async function airtableRequest<T>(
  path: string,
  init?: RequestInit,
  query?: Record<string, string | undefined>
) {
  const env = assertAirtableConfig();
  const searchParams = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const url = new URL(
    `https://api.airtable.com/v0/${env.airtableBaseId}/${path}`
  );
  if ([...searchParams.keys()].length > 0) {
    url.search = searchParams.toString();
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.airtableToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Airtable request failed (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
}

export async function listRecords<TFields>(
  tableName: string,
  params?: Record<string, string | undefined>
) {
  const records: AirtableRecord<TFields>[] = [];
  let offset = "";

  do {
    const query = Object.fromEntries(
      Object.entries({
        ...params,
        offset: offset || undefined
      }).filter(([, value]) => typeof value === "string" && value.length > 0)
    ) as Record<string, string>;
    const payload = await airtableRequest<ListResponse<TFields>>(
      encodeURIComponent(tableName),
      undefined,
      query
    );
    records.push(...payload.records);
    offset = payload.offset || "";
  } while (offset);

  return records;
}

export async function getRecord<TFields>(tableName: string, recordId: string) {
  return airtableRequest<AirtableRecord<TFields>>(
    `${encodeURIComponent(tableName)}/${recordId}`
  );
}

export async function createRecord<TFields extends Record<string, unknown>>(
  tableName: string,
  fields: TFields
) {
  return airtableRequest<AirtableRecord<TFields>>(encodeURIComponent(tableName), {
    method: "POST",
    body: JSON.stringify({ fields })
  });
}

export async function updateRecord<TFields extends Record<string, unknown>>(
  tableName: string,
  recordId: string,
  fields: Partial<TFields>
) {
  return airtableRequest<AirtableRecord<TFields>>(
    `${encodeURIComponent(tableName)}/${recordId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ fields })
    }
  );
}
