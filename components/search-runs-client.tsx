"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FlashBanner } from "@/components/flash-banner";
import { ResearchRunForm } from "@/components/research-run-form";
import { parseSearchRunProgress } from "@/lib/search-run-progress";
import type { Profile, SearchRun } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type SearchRunsClientProps = {
  airtableConfigured: boolean;
  initialMessage?: string;
  initialRuns: SearchRun[];
  initialSearch: string;
  initialStatus?: string;
  initialTargetType: string;
  openAiConfigured: boolean;
  profiles: Profile[];
};

function sortRuns(runs: SearchRun[]) {
  return [...runs].sort((left, right) => right.runDate.localeCompare(left.runDate));
}

function mergeRuns(current: SearchRun[], next: SearchRun[]) {
  const optimisticRuns = current.filter((run) => run.id.startsWith("pending-"));
  const merged = [...next];

  for (const optimisticRun of optimisticRuns) {
    if (!merged.some((run) => run.id === optimisticRun.id)) {
      merged.push(optimisticRun);
    }
  }

  return sortRuns(merged);
}

function statusLabel(status: SearchRun["status"]) {
  switch (status) {
    case "running":
      return "In progress";
    case "queued":
      return "Queued";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

export function SearchRunsClient({
  airtableConfigured,
  initialMessage,
  initialRuns,
  initialSearch,
  initialStatus,
  initialTargetType,
  openAiConfigured,
  profiles
}: SearchRunsClientProps) {
  const [runs, setRuns] = useState(() => sortRuns(initialRuns));
  const [search, setSearch] = useState(initialSearch);
  const [targetType, setTargetType] = useState(initialTargetType);
  const [flash, setFlash] = useState({
    status: initialStatus,
    message: initialMessage
  });

  const filteredRuns = runs.filter((run) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      run.runName.toLowerCase().includes(query) ||
      run.queryText.toLowerCase().includes(query);
    const matchesType = targetType === "all" || run.targetType === targetType;
    return matchesSearch && matchesType;
  });
  const hasActiveRun = runs.some((run) => run.status === "running" || run.status === "queued");

  useEffect(() => {
    if (!hasActiveRun) {
      return undefined;
    }

    let cancelled = false;

    async function refreshRuns() {
      try {
        const response = await fetch("/api/search-runs", {
          cache: "no-store"
        });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as SearchRun[];
        if (!cancelled) {
          setRuns((current) => mergeRuns(current, payload));
        }
      } catch {
        // Ignore polling failures and try again on the next interval.
      }
    }

    void refreshRuns();
    const intervalId = window.setInterval(() => {
      void refreshRuns();
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [hasActiveRun]);

  function handleRunQueued(tempId: string, searchRun: SearchRun) {
    setRuns((current) => sortRuns([searchRun, ...current.filter((run) => run.id !== tempId)]));
    setFlash({
      status: "success",
      message: "Research run started. Tracking status in the previous runs list."
    });
  }

  function handleRunConfirmed(tempId: string, searchRun: SearchRun, message: string) {
    setRuns((current) =>
      sortRuns([
        searchRun,
        ...current.filter((run) => run.id !== tempId && run.id !== searchRun.id)
      ])
    );
    setFlash({
      status: "success",
      message
    });
  }

  function handleRunError(tempId: string, message: string) {
    setRuns((current) => current.filter((run) => run.id !== tempId));
    setFlash({
      status: "error",
      message
    });
  }

  return (
    <>
      <FlashBanner status={flash.status} message={flash.message} />

      <section className="content-grid">
        <article className="content-panel">
          <h2 className="panel-title">Run lab research</h2>
          {airtableConfigured && openAiConfigured ? (
            <ResearchRunForm
              action="/api/research/labs"
              buttonLabel="Run lab search"
              loadingLabel="Starting lab search..."
              filterPlaceholder="e.g. undergrad-friendly, computational cognition"
              onRunConfirmed={handleRunConfirmed}
              onRunError={handleRunError}
              onRunQueued={handleRunQueued}
              profiles={profiles}
              queryDefaultValue="Find UC Davis labs and professors aligned with cognitive science, AI, HCI, and computer science."
              targetType="lab"
            />
          ) : (
            <p className="muted">Configure Airtable and OpenAI to start a lab search.</p>
          )}
        </article>

        <article className="content-panel">
          <h2 className="panel-title">Run startup research</h2>
          {airtableConfigured && openAiConfigured ? (
            <ResearchRunForm
              action="/api/research/startups"
              buttonLabel="Run startup search"
              loadingLabel="Starting startup search..."
              filterPlaceholder="e.g. seed to series A, remote-friendly"
              onRunConfirmed={handleRunConfirmed}
              onRunError={handleRunError}
              onRunQueued={handleRunQueued}
              profiles={profiles}
              queryDefaultValue="Find funded startups relevant to AI, developer tools, cognition, HCI, or research software that are hiring or likely to hire."
              targetType="startup"
            />
          ) : (
            <p className="muted">Configure Airtable and OpenAI to start a startup search.</p>
          )}
        </article>
      </section>

      <section className="content-panel">
        <form className="filter-bar" onSubmit={(event) => event.preventDefault()}>
          <label>
            Search
            <input
              name="search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search runs"
              value={search}
            />
          </label>
          <label>
            Target type
            <select
              name="targetType"
              onChange={(event) => setTargetType(event.target.value)}
              value={targetType}
            >
              <option value="all">all</option>
              <option value="lab">lab</option>
              <option value="startup">startup</option>
            </select>
          </label>
          <button type="submit">Apply filters</button>
        </form>
        <h2 className="panel-title">Previous runs</h2>
        <div className="list-stack">
          {filteredRuns.length === 0 ? (
            <p className="muted">No search runs recorded yet.</p>
          ) : (
            filteredRuns.map((run) => {
              const progress = parseSearchRunProgress(run.notes);
              const content = (
                <>
                  <div className="list-card-top">
                    <h3>{run.runName}</h3>
                    <span className="pill">{statusLabel(run.status)}</span>
                  </div>
                  <p className="muted">
                    {run.targetType} via {run.source} on {formatDate(run.runDate)}
                  </p>
                  <p>{run.queryText}</p>
                  <p className="muted">
                    Results: {run.resultCount} imported: {run.importedCount}
                  </p>
                  {run.notes ? (
                    <p className="muted">
                      Progress: {progress?.currentMessage || run.notes}
                    </p>
                  ) : null}
                </>
              );

              if (run.id.startsWith("pending-")) {
                return (
                  <div className="list-card" key={run.id}>
                    {content}
                  </div>
                );
              }

              return (
                <Link className="list-card link-panel" href={`/search-runs/${run.id}`} key={run.id}>
                  {content}
                </Link>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}
