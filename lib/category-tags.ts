const CANONICAL_TAGS = [
  "ai_ml",
  "hci",
  "cognitive_science",
  "neuroscience",
  "nlp",
  "robotics",
  "healthtech",
  "edtech",
  "developer_tools",
  "consumer",
  "research_platforms"
] as const;

export type CanonicalCategoryTag = (typeof CANONICAL_TAGS)[number];

const TAG_SYNONYMS: Record<string, CanonicalCategoryTag> = {
  ai: "ai_ml",
  "ai/ml": "ai_ml",
  aiml: "ai_ml",
  "machine learning": "ai_ml",
  ml: "ai_ml",
  hci: "hci",
  "human computer interaction": "hci",
  "human-computer interaction": "hci",
  "cognitive science": "cognitive_science",
  cogsci: "cognitive_science",
  cognition: "cognitive_science",
  neuroscience: "neuroscience",
  neuro: "neuroscience",
  nlp: "nlp",
  "natural language processing": "nlp",
  robotics: "robotics",
  robot: "robotics",
  healthtech: "healthtech",
  "health tech": "healthtech",
  medtech: "healthtech",
  "medical technology": "healthtech",
  edtech: "edtech",
  "developer tools": "developer_tools",
  devtools: "developer_tools",
  "dev tools": "developer_tools",
  consumer: "consumer",
  "research platforms": "research_platforms",
  "research platform": "research_platforms"
};

export function normalizeCategoryTag(value: string): CanonicalCategoryTag | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[/-]/g, " ")
    .replace(/\s+/g, " ");

  if ((CANONICAL_TAGS as readonly string[]).includes(normalized)) {
    return normalized as CanonicalCategoryTag;
  }

  return TAG_SYNONYMS[normalized] || null;
}

export function normalizeCategoryTags(values: string[]) {
  const output: CanonicalCategoryTag[] = [];
  for (const value of values) {
    const tag = normalizeCategoryTag(value);
    if (tag && !output.includes(tag)) {
      output.push(tag);
    }
  }
  return output;
}

export function categoryTagPromptList() {
  return CANONICAL_TAGS.join(", ");
}
