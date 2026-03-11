export function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function asNumber(value: unknown) {
  return typeof value === "number" ? value : 0;
}

export function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

export function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function asLinkedIds(value: unknown) {
  return asStringArray(value);
}

export function toIsoDate(value: unknown) {
  if (typeof value !== "string" || !value) {
    return "";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function formatDate(value: string) {
  if (!value) {
    return "Not set";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not set"
    : new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }).format(date);
}

export function compactObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry === undefined || entry === null) {
        return false;
      }
      if (typeof entry === "string") {
        return entry.trim().length > 0;
      }
      if (Array.isArray(entry)) {
        return entry.length > 0;
      }
      return true;
    })
  );
}

export function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function parseJsonBlock<T>(value: string, fallback: T): T {
  const match = value.match(/```json\s*([\s\S]*?)```/i);
  const content = match?.[1] ?? value;
  return safeJsonParse(content, fallback);
}
