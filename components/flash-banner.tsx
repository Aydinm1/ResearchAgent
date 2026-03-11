type FlashBannerProps = {
  status?: string;
  message?: string;
};

export function FlashBanner({ status, message }: FlashBannerProps) {
  if (!status || !message) {
    return null;
  }

  const isError = status === "error";

  return (
    <section className={isError ? "flash-banner flash-error" : "flash-banner flash-success"}>
      <p className="eyebrow">{isError ? "Action failed" : "Action complete"}</p>
      <p>{message}</p>
    </section>
  );
}
