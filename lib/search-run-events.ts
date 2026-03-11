import type { Finding, SearchRun } from "@/lib/types";

type SearchRunEvent =
  | {
      type: "search-run.updated";
      searchRun: SearchRun;
      searchRunId: string;
    }
  | {
      type: "finding.created";
      finding: Finding;
      searchRunId: string;
    };

type Listener = (event: SearchRunEvent) => void;

const listeners = new Set<Listener>();

export function subscribeToSearchRunEvents(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function publishSearchRunEvent(event: SearchRunEvent) {
  for (const listener of listeners) {
    listener(event);
  }
}

export type { SearchRunEvent };
