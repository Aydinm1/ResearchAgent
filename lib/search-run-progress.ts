import { safeJsonParse } from "@/lib/utils";

export type SearchRunProgressStepKey =
  | "run_created"
  | "load_profile"
  | "discover_candidates"
  | "enrich_candidates"
  | "import_findings"
  | "finished";

export type SearchRunProgressStepStatus = "pending" | "running" | "completed" | "failed";

export type SearchRunProgressStep = {
  key: SearchRunProgressStepKey;
  label: string;
  startedAt: string;
  completedAt: string;
  status: SearchRunProgressStepStatus;
};

export type SearchRunProgress = {
  currentMessage: string;
  steps: SearchRunProgressStep[];
  updatedAt: string;
  version: 1;
};

const stepDefinitions: Array<{ key: SearchRunProgressStepKey; label: string }> = [
  { key: "run_created", label: "Run created" },
  { key: "load_profile", label: "Load profile" },
  { key: "discover_candidates", label: "Discovery agent" },
  { key: "enrich_candidates", label: "Enrichment agents" },
  { key: "import_findings", label: "Import findings" },
  { key: "finished", label: "Finished" }
];

function createSteps(now: string): SearchRunProgressStep[] {
  return stepDefinitions.map((step) => ({
    key: step.key,
    label: step.label,
    startedAt: "",
    completedAt: "",
    status: (step.key === "run_created" ? "completed" : "pending") as SearchRunProgressStepStatus
  })).map((step) =>
    step.key === "run_created"
      ? {
          ...step,
          startedAt: now,
          completedAt: now
        }
      : step
  );
}

export function createInitialSearchRunProgress(now = new Date().toISOString()): SearchRunProgress {
  return {
    currentMessage: "Queued. Preparing research run.",
    steps: createSteps(now),
    updatedAt: now,
    version: 1
  };
}

export function parseSearchRunProgress(value: string): SearchRunProgress | null {
  if (!value.trim().startsWith("{")) {
    return null;
  }

  const parsed = safeJsonParse<SearchRunProgress | null>(value, null);
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.steps)) {
    return null;
  }

  return parsed;
}

export function serializeSearchRunProgress(progress: SearchRunProgress) {
  return JSON.stringify(progress);
}

function updateStep(
  progress: SearchRunProgress,
  key: SearchRunProgressStepKey,
  updater: (step: SearchRunProgressStep) => SearchRunProgressStep
) {
  return {
    ...progress,
    steps: progress.steps.map((step) => (step.key === key ? updater(step) : step))
  };
}

export function startSearchRunStep(
  progress: SearchRunProgress,
  key: SearchRunProgressStepKey,
  message: string,
  now = new Date().toISOString()
): SearchRunProgress {
  return {
    ...updateStep(progress, key, (step) => ({
      ...step,
      startedAt: step.startedAt || now,
      status: "running"
    })),
    currentMessage: message,
    updatedAt: now
  };
}

export function completeSearchRunStep(
  progress: SearchRunProgress,
  key: SearchRunProgressStepKey,
  now = new Date().toISOString()
): SearchRunProgress {
  return {
    ...updateStep(progress, key, (step) => ({
      ...step,
      startedAt: step.startedAt || now,
      completedAt: now,
      status: "completed"
    })),
    updatedAt: now
  };
}

export function failSearchRunStep(
  progress: SearchRunProgress,
  key: SearchRunProgressStepKey,
  message: string,
  now = new Date().toISOString()
): SearchRunProgress {
  return {
    ...updateStep(progress, key, (step) => ({
      ...step,
      startedAt: step.startedAt || now,
      completedAt: now,
      status: "failed"
    })),
    currentMessage: message,
    updatedAt: now
  };
}

export function setSearchRunMessage(
  progress: SearchRunProgress,
  message: string,
  now = new Date().toISOString()
): SearchRunProgress {
  return {
    ...progress,
    currentMessage: message,
    updatedAt: now
  };
}

export function formatDuration(ms: number) {
  if (ms < 1000) {
    return "<1s";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}
