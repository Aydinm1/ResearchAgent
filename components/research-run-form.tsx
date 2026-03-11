"use client";

import { useState } from "react";
import type { SearchRun, TargetType } from "@/lib/types";

type ProfileOption = {
  id: string;
  profileName: string;
};

type RunRequest = {
  filtersUsed: string;
  maxResults: number;
  profileId: string;
  queryText: string;
};

type ResearchRunFormProps = {
  action: string;
  buttonLabel: string;
  loadingLabel: string;
  queryDefaultValue: string;
  filterPlaceholder: string;
  profiles: ProfileOption[];
  targetType: TargetType;
  onRunQueued: (tempId: string, searchRun: SearchRun) => void;
  onRunConfirmed: (tempId: string, searchRun: SearchRun, message: string) => void;
  onRunError: (tempId: string, message: string) => void;
};

export function ResearchRunForm({
  action,
  buttonLabel,
  loadingLabel,
  queryDefaultValue,
  filterPlaceholder,
  profiles,
  targetType,
  onRunQueued,
  onRunConfirmed,
  onRunError
}: ResearchRunFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const request: RunRequest = {
      profileId: String(formData.get("profileId") || ""),
      queryText: String(formData.get("queryText") || ""),
      filtersUsed: String(formData.get("filtersUsed") || ""),
      maxResults: Number(formData.get("maxResults") || 6)
    };
    const tempId = `pending-${crypto.randomUUID()}`;

    onRunQueued(tempId, {
      id: tempId,
      runName: `${targetType} research - ${new Date().toLocaleDateString("en-US")}`,
      targetType,
      source: "manual",
      queryText: request.queryText,
      filtersUsed: request.filtersUsed,
      profileIds: [request.profileId],
      runDate: new Date().toISOString(),
      status: "running",
      notes: "",
      resultCount: 0,
      importedCount: 0
    });

    setIsSubmitting(true);

    try {
      const response = await fetch(action, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(request)
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        searchRun?: SearchRun;
      };

      if (!response.ok || !payload.searchRun) {
        throw new Error(payload.error || "Unable to start the research run.");
      }

      onRunConfirmed(
        tempId,
        payload.searchRun,
        payload.message || "Research run started. Status will update automatically."
      );
    } catch (error) {
      onRunError(
        tempId,
        error instanceof Error ? error.message : "Unable to start the research run."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label>
        Profile
        <select name="profileId" required defaultValue="">
          <option disabled value="">
            Select a profile
          </option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.profileName}
            </option>
          ))}
        </select>
      </label>
      <label>
        Query
        <textarea name="queryText" rows={4} defaultValue={queryDefaultValue} />
      </label>
      <label>
        Filters
        <input name="filtersUsed" placeholder={filterPlaceholder} />
      </label>
      <label>
        Max results
        <input name="maxResults" type="number" min="1" max="12" defaultValue="6" />
      </label>
      <button disabled={isSubmitting} type="submit">
        {isSubmitting ? loadingLabel : buttonLabel}
      </button>
      {isSubmitting ? (
        <p className="muted">
          Research run is starting. The previous runs list will update in place.
        </p>
      ) : null}
    </form>
  );
}
