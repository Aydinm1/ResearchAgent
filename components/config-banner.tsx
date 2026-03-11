type ConfigBannerProps = {
  configured: boolean;
  openAiConfigured?: boolean;
};

export function ConfigBanner({
  configured,
  openAiConfigured = false
}: ConfigBannerProps) {
  if (configured && openAiConfigured) {
    return null;
  }

  return (
    <section className="warning-banner">
      <p className="eyebrow">Setup required</p>
      <h2>Live data is not fully configured yet.</h2>
      <p className="muted">
        Add `AIRTABLE_BASE_ID` and `AIRTABLE_TOKEN` to enable reads and writes.
        Add `OPENAI_API_KEY` to enable research runs and draft generation.
      </p>
    </section>
  );
}
