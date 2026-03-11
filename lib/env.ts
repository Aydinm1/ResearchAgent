const optional = (value: string | undefined) => value?.trim() || "";

export type AppEnv = {
  airtableBaseId: string;
  airtableToken: string;
  openAiApiKey: string;
  openAiModel: string;
  appOwner: string;
};

export function getEnv(): AppEnv {
  return {
    airtableBaseId: optional(process.env.AIRTABLE_BASE_ID),
    airtableToken: optional(process.env.AIRTABLE_TOKEN),
    openAiApiKey: optional(process.env.OPENAI_API_KEY),
    openAiModel: optional(process.env.OPENAI_MODEL) || "gpt-5-mini",
    appOwner: optional(process.env.RESEARCH_APP_OWNER) || "Owner"
  };
}

export function hasAirtableConfig() {
  const env = getEnv();
  return Boolean(env.airtableBaseId && env.airtableToken);
}

export function hasOpenAiConfig() {
  return Boolean(getEnv().openAiApiKey);
}

export function getConfigurationStatus() {
  return {
    airtable: hasAirtableConfig(),
    openai: hasOpenAiConfig()
  };
}

export function assertAirtableConfig() {
  const env = getEnv();
  if (!env.airtableBaseId || !env.airtableToken) {
    throw new Error(
      "Missing Airtable configuration. Set AIRTABLE_BASE_ID and AIRTABLE_TOKEN."
    );
  }
  return env;
}

export function assertOpenAiConfig() {
  const env = getEnv();
  if (!env.openAiApiKey) {
    throw new Error("Missing OpenAI configuration. Set OPENAI_API_KEY.");
  }
  return env;
}
