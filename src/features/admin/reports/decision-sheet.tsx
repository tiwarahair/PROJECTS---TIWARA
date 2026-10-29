import { Mail } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "../../../components/confirm-dialog";
import { Button } from "../../../components/ds/button";
import { PHONE_QUERY, Sheet } from "../../../components/sheet";
import { useMediaQuery } from "../../../hooks/use-media-query";
import { DISCARD_PROMPT } from "../../../hooks/use-unsaved-changes";
import { StarRating } from "../../../components/star-rating";
import type { AdminReport, DecisionOutcome } from "../../../lib/admin-api";
import type { ReviewOutcome } from "../../../lib/review-api";
import { useAppDispatch } from "../../../stores/hooks";
import { showToast } from "../../../stores/toast-slice";
import { useAnswerAppealMutation, useDecideReviewMutation } from "../api";
import { formatWhen, getReporter, OUTCOMES, REASONS } from "./view";
import form from "../../../styles/components/report-review/index.module.css";
import styles from "../../../styles/features/admin/decision-sheet.module.css";

const CHOICES: { outcome: DecisionOutcome; label: string; note: string }[] = [
  {
    outcome: "kept",
    label: "Keep the review",
    note: "It stays up and counts. The reports are closed.",
  },
  {
    outcome: "text_removed",
    label: "Remove the words",
    note: "The stars stay and still count.",
  },
  {
    outcome: "removed",
    label: "Remove the review",
    note: "Taken down and stops counting.",
  },
  {
    outcome: "hidden",
    label: "Hide while checking",
    note: "Hidden and not counted until you decide.",
  },
];

const getEmails = (
  { client_name: client, stylist_name: stylist, reports, appeal }: AdminReport,
  outcome: DecisionOutcome,
) => {
  if (appeal)
    return appeal.appellant === "reviewer"
      ? [`${client}, who appealed`, `${stylist}, the stylist`]
      : [
          `${client}, who wrote the review`,
          `${stylist}, the stylist, who appealed`,
        ];

  if (outcome === "hidden")
    return ["Nobody yet. Everyone is told when you decide."];

  const reporters = reports
    .filter(
      ({ is_stylist: isStylist, reporter_deleted: isDeleted }) =>
        !isStylist && !isDeleted,
    )
    .map(({ reporter_name: name }) =>
      name ? `${name}, who reported it` : "The client who reported it",
    );

  return [
    ...(outcome === "kept" ? [] : [`${client}, with how to appeal`]),
    `${stylist}, the stylist`,
    ...reporters,
  ];
};

interface DecisionSheetProps {
  report: AdminReport;
  onClose: () => void;
}

/** Decide on a reported review, or answer an appeal against a decision. */
export const DecisionSheet = ({ report, onClose }: DecisionSheetProps) => {
  const dispatch = useAppDispatch();
  const isPhone = useMediaQuery(PHONE_QUERY);
  const { appeal, decision } = report;
  const [isChanging, setChanging] = useState(false);
  const [outcome, setOutcome] = useState<DecisionOutcome | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isDiscarding, setDiscarding] = useState(false);
  const [decide, { isLoading: isDeciding }] = useDecideReviewMutation();
  const [answer, { isLoading: isAnswering }] = useAnswerAppealMutation();
  const isAppeal = !!appeal && !!decision && !isChanging;
  const isDirty = !!outcome || !!note.trim();

  const requestClose = () => (isDirty ? setDiscarding(true) : onClose());

  const choices = CHOICES.filter(({ outcome: choice }) =>
    appeal
      ? choice !== "hidden" && choice !== decision?.outcome
      : choice !== "hidden" || report.status !== "hidden",
  );

  const finish = (message: string) => {
    // above the bottom bar on phones
    dispatch(showToast(message, null, { bottom: isPhone ? 96 : 24 }));
    onClose();
  };

  const fail = () => setError("That didn’t save. Try again.");

  const save = (keep = false) => {
    if (!keep && !outcome) return setError("Choose a decision.");

    if (!note.trim()) return setError("Add a note so other admins know why.");

    setError("");

    if (appeal)
      return void answer({
        appealId: appeal.id,
        outcome: keep ? "keep" : (outcome as ReviewOutcome),
        note,
      })
        .unwrap()
        .then(
          () =>
            finish(
              keep
                ? "Decision kept. Both sides emailed."
                : "Decision changed. Both sides emailed.",
            ),
          fail,
        );

    void decide({
      reviewId: report.id,
      outcome: outcome as DecisionOutcome,
      note,
    })
      .unwrap()
      .then(
        () =>
          finish(
            outcome === "hidden" ? "Hidden while checking" : "Decision saved",
          ),
        fail,
      );
  };

  const isBusy = isDeciding || isAnswering;

  const footer = isAppeal ? (
    <>
      <Button variant="ghost" onClick={() => setChanging(true)}>
        Change decision
      </Button>
      <Button disabled={isBusy} onClick={() => save(true)}>
        {isBusy ? "Saving…" : "Keep decision"}
      </Button>
    </>
  ) : (
    <>
      <Button variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button disabled={isBusy} onClick={() => save()}>
        {isBusy ? "Saving…" : "Save decision"}
      </Button>
    </>
  );

  return (
    <Sheet
      open
      title={appeal ? "Appeal" : "Decide on this review"}
      onClose={requestClose}
      footer={footer}
    >
      {isDiscarding && (
        <ConfirmDialog
          title={DISCARD_PROMPT.title}
          body={DISCARD_PROMPT.body}
          yesLabel={DISCARD_PROMPT.discard}
          noLabel={DISCARD_PROMPT.keep}
          onYes={onClose}
          onNo={() => setDiscarding(false)}
        />
      )}
      <div className={styles.review}>
        <div className={styles.meta}>
          <StarRating rating={report.rating} />
          <span>{`${report.client_name} on ${report.stylist_name} · ${report.service_name}`}</span>
        </div>
        {!!report.body && <p className={styles.body}>{report.body}</p>}
        {report.reports.map(
          ({ reason, details, created_at: reportedAt, ...reporter }) => (
            <p key={reportedAt + reason} className={styles.reportLine}>
              <b>{REASONS[reason]}</b>
              {`, reported by ${getReporter(reporter)} ${formatWhen(reportedAt)}${details ? `: “${details}”` : ""}`}
            </p>
          ),
        )}
      </div>
      {!!appeal && !!decision && (
        <>
          <div className={styles.decision}>
            <span className={styles.label}>The decision</span>
            <b>{OUTCOMES[decision.outcome]}</b>
            <span className={styles.muted}>
              {`${decision.admin_name}, ${formatWhen(decision.created_at)}: “${decision.note}”`}
            </span>
          </div>
          <div className={styles.appeal}>
            <span className={styles.label}>
              {`Appeal from the ${appeal.appellant}, ${formatWhen(appeal.created_at)}`}
            </span>
            <span>{`“${appeal.body}”`}</span>
          </div>
        </>
      )}
      {!isAppeal && (
        <fieldset className={form.reasons}>
          <legend className={form.legend}>
            {appeal ? "Your new decision" : "Your decision"}
          </legend>
          {choices.map(({ outcome: value, label, note: choiceNote }) => (
            <label key={value} className={form.reason}>
              <input
                type="radio"
                name="decision"
                value={value}
                checked={outcome === value}
                onChange={() => {
                  setOutcome(value);
                  setError("");
                }}
              />
              <span className={styles.choice}>
                <span className={styles.choiceLabel}>{label}</span>
                <span className={styles.muted}>{choiceNote}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      <label className={form.field}>
        <span className={form.legend}>
          Note <span className={form.optional}>(required)</span>
        </span>
        <textarea
          className={form.textarea}
          value={note}
          maxLength={1000}
          rows={3}
          onChange={(event) => {
            setNote(event.target.value);
            setError("");
          }}
        />
      </label>
      {!isAppeal && !!outcome && (
        <div className={styles.emails}>
          <span className={styles.label}>Who gets emailed</span>
          {getEmails(report, outcome).map((line) => (
            <span key={line} className={styles.email}>
              <Mail size={15} strokeWidth={2.6} className={styles.emailIcon} />
              {line}
            </span>
          ))}
        </div>
      )}
      {isAppeal && (
        <p className={styles.hint}>
          Both sides are emailed the answer, which is final.
        </p>
      )}
      {!!error && (
        <p className={form.error} role="alert">
          {error}
        </p>
      )}
    </Sheet>
  );
};
