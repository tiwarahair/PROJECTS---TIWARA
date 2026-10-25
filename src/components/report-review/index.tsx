import { useState } from "react";
import { Button } from "../ds/button";
import { ReviewRulesLink } from "../review-rules-link";
import type { ReportReason } from "../../lib/review-api";
import { Sheet } from "../sheet";
import { useReportReviewMutation } from "../../stores/api-slice";
import styles from "../../styles/components/report-review/index.module.css";

const REASONS: { reason: ReportReason; label: string }[] = [
  { reason: "abusive", label: "Abusive, hateful or harassing" },
  {
    reason: "personal_info",
    label: "Shares private details, like a phone number",
  },
  {
    reason: "conflict",
    label: "Written by someone with a conflict of interest",
  },
  { reason: "spam", label: "Spam or advertising" },
  { reason: "threat", label: "A threat, or asks for something in return" },
  { reason: "other", label: "Other" },
];

interface ReportReviewProps {
  reviewId: string;
  onClose: () => void;
}

/** Report a review with a reason; abuse, private details and threats are hidden while we check, the rest stay up. */
export const ReportReview = ({ reviewId, onClose }: ReportReviewProps) => {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [report, { data: outcome, isLoading }] = useReportReviewMutation();

  const send = async () => {
    if (!reason) {
      setError("Choose a reason.");

      return;
    }

    if (reason === "other" && !details.trim()) {
      setError("Tell us what’s wrong with it.");

      return;
    }

    await report({ reviewId, reason, details })
      .unwrap()
      .catch(() => setError("We couldn’t send your report. Try again."));
  };

  if (outcome)
    return (
      <Sheet
        open
        size="sm"
        title="Thanks for telling us"
        onClose={onClose}
        footer={<Button onClick={onClose}>Done</Button>}
      >
        <p className={styles.text}>
          {outcome === "already_reported" ? (
            "You’ve already reported this review. We’ll email you when we’ve decided."
          ) : (
            <>
              We’ll check it against <ReviewRulesLink /> and email you what we
              decided, usually within 5 working days (24 hours for abuse,
              private details or threats). A bad rating on its own isn’t a
              reason to remove a review.
            </>
          )}
        </p>
      </Sheet>
    );

  return (
    <Sheet
      open
      size="sm"
      title="Report this review"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={isLoading} onClick={() => void send()}>
            {isLoading ? "Sending…" : "Send report"}
          </Button>
        </>
      }
    >
      <fieldset className={styles.reasons}>
        <legend className={styles.legend}>What’s wrong with it?</legend>
        {REASONS.map(({ reason: value, label }) => (
          <label key={value} className={styles.reason}>
            <input
              type="radio"
              name="report-reason"
              value={value}
              checked={reason === value}
              onChange={() => {
                setReason(value);
                setError("");
              }}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <a
        className={styles.policyLink}
        href="/reviews"
        target="_blank"
        rel="noreferrer"
      >
        Read our review policy
      </a>
      <label className={styles.field}>
        <span className={styles.legend}>
          {reason === "other" ? "What’s wrong with it?" : "Anything else?"}{" "}
          <span className={styles.optional}>
            {reason === "other" ? "(required)" : "(optional)"}
          </span>
        </span>
        <textarea
          className={styles.textarea}
          value={details}
          maxLength={1000}
          rows={3}
          onChange={(event) => setDetails(event.target.value)}
        />
      </label>
      {!!error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </Sheet>
  );
};
