import { assertOpenAiConfig, getEnv } from "@/lib/env";

type ResponsePayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

function extractOutputText(payload: ResponsePayload) {
  if (payload.output_text) {
    return payload.output_text;
  }

  return (
    payload.output
      ?.flatMap((item) => item.content || [])
      .filter((item) => item.type === "output_text" || item.type === "text")
      .map((item) => item.text || "")
      .join("\n") || ""
  );
}

export async function createOpenAiResponse(input: {
  prompt: string;
  enableWebSearch?: boolean;
}) {
  const env = assertOpenAiConfig();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openAiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: getEnv().openAiModel,
      input: input.prompt,
      tools: input.enableWebSearch ? [{ type: "web_search" }] : undefined
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${text}`);
  }

  const payload = (await response.json()) as ResponsePayload;
  return extractOutputText(payload);
}
