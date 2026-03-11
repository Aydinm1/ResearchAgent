"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatDuration,
  parseSearchRunProgress
} from "@/lib/search-run-progress";
import type { Finding, SearchRun } from "@/lib/types";
import { formatDate, parseJsonBlock } from "@/lib/utils";

type SearchRunDetailClientProps = {
  initialFindings: Finding[];
  initialSearchRun: SearchRun;
};

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

function statusPillLabel(status: string) {
  switch (status) {
    case "running":
      return "Running";
    case "completed":
      return "Done";
    case "failed":
      return "Failed";
    default:
      return "Pending";
  }
}

function stepDurationLabel(
  startedAt: string,
  completedAt: string,
  now: number
) {
  if (!startedAt) {
    return "Not started";
  }

  const startedMs = new Date(startedAt).getTime();
  if (Number.isNaN(startedMs)) {
    return "Not started";
  }

  const endMs = completedAt ? new Date(completedAt).getTime() : now;
  if (Number.isNaN(endMs) || endMs < startedMs) {
    return "Not started";
  }

  return formatDuration(endMs - startedMs);
}

export function SearchRunDetailClient({
  initialFindings,
  initialSearchRun
}: SearchRunDetailClientProps) {
  const [searchRun, setSearchRun] = useState(initialSearchRun);
  const [findings, setFindings] = useState(initialFindings);
  const [now, setNow] = useState(() => Date.now());
  const shouldPoll = searchRun.status === "running" || searchRun.status === "queued";
  const progress = parseSearchRunProgress(searchRun.notes);

  useEffect(() => {
    if (!shouldPoll) {
      return undefined;
    }

    const eventSource = new EventSource(
      `/api/search-runs/events?searchRunId=${encodeURIComponent(searchRun.id)}`
    );

    const handleSearchRunUpdate = (event: MessageEvent<string>) => {
      const payload = JSON.parse(event.data) as {
        searchRun: SearchRun;
      };
      setSearchRun(payload.searchRun);
    };

    const handleFindingCreated = (event: MessageEvent<string>) => {
      const payload = JSON.parse(event.data) as {
        finding: Finding;
      };
      setFindings((current) => {
        if (current.some((finding) => finding.id === payload.finding.id)) {
          return current;
        }
        return [...current, payload.finding];
      });
    };

    eventSource.addEventListener("search-run.updated", handleSearchRunUpdate as EventListener);
    eventSource.addEventListener("finding.created", handleFindingCreated as EventListener);

    return () => {
      eventSource.removeEventListener(
        "search-run.updated",
        handleSearchRunUpdate as EventListener
      );
      eventSource.removeEventListener(
        "finding.created",
        handleFindingCreated as EventListener
      );
      eventSource.close();
    };
  }, [searchRun.id, shouldPoll]);

  useEffect(() => {
    if (!shouldPoll) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [shouldPoll]);

  return (
    <>
      <section className="content-grid">
        <article className="content-panel">
          <h2 className="panel-title">Run metadata</h2>
          <dl className="summary-list">
            <div>
              <dt>Status</dt>
              <dd>{statusLabel(searchRun.status)}</dd>
            </div>
            <div>
              <dt>Results</dt>
              <dd>{searchRun.resultCount}</dd>
            </div>
            <div>
              <dt>Imported</dt>
              <dd>{searchRun.importedCount}</dd>
            </div>
          </dl>
          <p>
            <strong>Query:</strong> {searchRun.queryText || "Not provided"}
          </p>
          <p>
            <strong>Filters:</strong> {searchRun.filtersUsed || "None"}
          </p>
          <p>
            <strong>Live progress:</strong>{" "}
            {progress?.currentMessage || searchRun.notes || "No progress details yet."}
          </p>
          {shouldPoll ? (
            <p className="muted">
              These updates are live run stages. During OpenAI web search, some steps are estimated while the response is still in flight.
            </p>
          ) : null}
          {shouldPoll ? <p className="muted">Streaming live updates while this run is active.</p> : null}
        </article>

        <article className="content-panel">
          <h2 className="panel-title">Tracking</h2>
          <p className="muted">
            This timeline updates while the run is active so you can see where it is spending time.
          </p>
          <div className="list-stack">
            {(progress?.steps || []).map((item) => (
              <div className="list-card" key={item.label}>
                <div className="list-card-top">
                  <h3>{item.label}</h3>
                  <span className="pill">{statusPillLabel(item.status)}</span>
                </div>
                <p className="muted">Time: {stepDurationLabel(item.startedAt, item.completedAt, now)}</p>
              </div>
            ))}
            {!progress ? (
              <p className="muted">
                Detailed timing is not available for this older run because it was created before step tracking was added.
              </p>
            ) : null}
          </div>
        </article>
      </section>

      <section className="content-panel">
        <h2 className="panel-title">Result provenance</h2>
        <p className="muted">
          Each finding below was created from this run and can be promoted into an opportunity.
        </p>
        <p>
          <Link href="/findings">Open findings queue</Link>
        </p>
      </section>

      <section className="content-panel">
        <h2 className="panel-title">Findings from this run</h2>
        <div className="list-stack">
          {findings.length === 0 ? (
            <p className="muted">
              {shouldPoll
                ? "This run has not imported findings yet."
                : "No findings linked to this run yet."}
            </p>
          ) : (
            findings.map((finding) => {
              const structured = parseJsonBlock<{ detailSummary?: string }>(
                finding.structuredData,
                { detailSummary: "" }
              );
              return (
                <article className="list-card" key={finding.id}>
                  <div className="list-card-top">
                    <div>
                      <p className="eyebrow">{finding.targetType}</p>
                      <h3>{finding.candidateName || finding.title}</h3>
                    </div>
                    <span className="pill">{finding.decision || "new"}</span>
                  </div>
                  <p className="muted">{finding.url}</p>
                  <p>{finding.snippet}</p>
                  {structured.detailSummary ? (
                    <p className="muted">{structured.detailSummary}</p>
                  ) : null}
                  <p className="muted">Verified {formatDate(finding.lastVerified)}</p>
                </article>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}
