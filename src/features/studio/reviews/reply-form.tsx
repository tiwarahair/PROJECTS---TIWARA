import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/ds/button";
import {
  useAppealReviewMutation,
  useReplyToReviewMutation,
} from "../../../stores/api-slice";
import styles from "../../../styles/features/studio/reviews/reply-form.module.css";

interface TextFormProps {
  label: string;
  hint: string;
  initial: string;
  empty: string;
  saveLabel: string;
  isSaving: boolean;
  onSave: (text: string) => Promise<unknown>;
  failure: string;
  onDone: () => void;
}

const TextForm = ({
  label,
  hint,
  initial,
  empty,
  saveLabel,
  isSaving,
  onSave,
  failure,
  onDone,
}: TextFormProps) => {
  const [text, setText] = useState(initial);
  const [error, setError] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => textRef.current?.focus(), []);

  const send = async () => {
    if (!text.trim()) {
      setError(empty);

      return;
    }

    await onSave(text)
      .then(onDone)
      .catch(() => setError(failure));
  };

  return (
    <div className={styles.replyForm}>
      <label className={styles.replyLabel}>
        {label}
        <textarea
          ref={textRef}
          className={styles.textarea}
          value={text}
          maxLength={1000}
          rows={3}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <p className={styles.hint}>{hint}</p>
      {!!error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.replyActions}>
        <Button variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button size="sm" disabled={isSaving} onClick={() => void send()}>
          {isSaving ? "Saving…" : saveLabel}
        </Button>
      </div>
    </div>
  );
};

interface ReplyFormProps {
  reviewId: string;
  reply: string;
  onDone: () => void;
}

/** A public reply, or a change to it (marked "Edited" on the profile). */
export const ReplyForm = ({ reviewId, reply, onDone }: ReplyFormProps) => {
  const [save, { isLoading }] = useReplyToReviewMutation();

  return (
    <TextForm
      label={reply ? "Edit your public reply" : "Your public reply"}
      hint={`Everyone can see your reply on your profile.${reply ? "" : " The client is emailed when you first reply."}`}
      initial={reply}
      empty="Write a reply first."
      saveLabel="Save reply"
      isSaving={isLoading}
      onSave={(text) => save({ reviewId, reply: text }).unwrap()}
      failure="Your reply didn’t save. Try again."
      onDone={onDone}
    />
  );
};

interface AppealFormProps {
  reviewId: string;
  onDone: () => void;
}

/** One appeal against our decision on a review the stylist reported. */
export const AppealForm = ({ reviewId, onDone }: AppealFormProps) => {
  const [appeal, { isLoading }] = useAppealReviewMutation();

  return (
    <TextForm
      label="Why should we look again?"
      hint="You can appeal once. Someone from our team looks again and emails you the answer, which is final."
      initial=""
      empty="Tell us why first."
      saveLabel="Send appeal"
      isSaving={isLoading}
      onSave={(body) => appeal({ reviewId, body }).unwrap()}
      failure="Your appeal didn’t send. Try again."
      onDone={onDone}
    />
  );
};
