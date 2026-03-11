import { ConfigBanner } from "@/components/config-banner";
import { SearchRunsClient } from "@/components/search-runs-client";
import { getConfigurationStatus } from "@/lib/env";
import { getDashboardData } from "@/lib/services/app-data";

export default async function SearchRunsPage({
  searchParams
}: {
  searchParams: Promise<{
    status?: string;
    message?: string;
    search?: string;
    targetType?: string;
  }>;
}) {
  const data = await getDashboardData();
  const config = getConfigurationStatus();
  const params = await searchParams;

  return (
    <main className="page-shell stack">
      <section className="section-heading">
        <p className="eyebrow">Search Runs</p>
        <h1 className="page-title">Launch new research runs and review previous batches.</h1>
        <p className="muted">
          v1 runs on demand. Each run creates a search record, calls the provider,
          and stores raw findings for later review.
        </p>
      </section>

      <ConfigBanner configured={config.airtable} openAiConfigured={config.openai} />
      <SearchRunsClient
        airtableConfigured={config.airtable}
        initialMessage={params.message}
        initialRuns={data.searchRuns}
        initialSearch={params.search || ""}
        initialStatus={params.status}
        initialTargetType={params.targetType || "all"}
        openAiConfigured={config.openai}
        profiles={data.profiles}
      />
    </main>
  );
}
