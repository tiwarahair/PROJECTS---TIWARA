import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/ds/button";
import { useReplyToReviewMutation } from "../../../stores/api-slice";
import styles from "../../../styles/features/studio/reviews/reply-form.module.css";

interface ReplyFormProps {
  reviewId: string;
  reply: string;
  onDone: () => void;
}

/** A public reply, or a change to it (marked "Edited" on the profile). */
export const ReplyForm = ({ reviewId, reply, onDone }: ReplyFormProps) => {
  const [text, setText] = useState(reply);
  const [error, setError] = useState("");
  const [save, { isLoading }] = useReplyToReviewMutation();
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => textRef.current?.focus(), []);

  const send = async () => {
    if (!text.trim()) {
      setError("Write a reply first.");

      return;
    }

    await save({ reviewId, reply: text })
      .unwrap()
      .then(onDone)
      .catch(() => setError("Your reply didn’t save. Try again."));
  };

  return (
    <div className={styles.replyForm}>
      <label className={styles.replyLabel}>
        {reply ? "Edit your public reply" : "Your public reply"}
        <textarea
          ref={textRef}
          className={styles.textarea}
          value={text}
          maxLength={1000}
          rows={3}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <p className={styles.hint}>
        Everyone can see your reply on your profile.
        {!reply && " The client is emailed when you first reply."}
      </p>
      {!!error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.replyActions}>
        <Button variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button size="sm" disabled={isLoading} onClick={() => void send()}>
          {isLoading ? "Saving…" : "Save reply"}
        </Button>
      </div>
    </div>
  );
};
