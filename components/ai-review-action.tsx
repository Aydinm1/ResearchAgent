"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AiReviewActionProps = {
  action: string;
  body: Record<string, string>;
  buttonLabel: string;
  disabled?: boolean;
  loadingLabel: string;
  pendingMessage: string;
  successMessage: string;
};

export function AiReviewAction({
  action,
  body,
  buttonLabel,
  disabled,
  loadingLabel,
  pendingMessage,
  successMessage
}: AiReviewActionProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<"muted" | "error">("muted");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || disabled) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(pendingMessage);
    setFeedbackTone("muted");

    try {
      const response = await fetch(action, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to run AI review.");
      }

      setFeedback(successMessage);
      setFeedbackTone("muted");
      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Unable to run AI review."
      );
      setFeedbackTone("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <button disabled={disabled || isSubmitting} type="submit">
        {isSubmitting ? loadingLabel : buttonLabel}
      </button>
      {feedback ? (
        <p className={feedbackTone === "error" ? "flash-error" : "muted"}>{feedback}</p>
      ) : null}
    </form>
  );
}
