import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { CodeCheck } from "../../lib/manage-booking-api";
import {
  getErrorMessage,
  useSendBookingCodeMutation,
  useVerifyBookingCodeMutation,
} from "../../stores/api-slice";
import { joinClassNames } from "../../utils/class-names";
import dialog from "../../styles/features/manage-booking/confirm-dialog.module.css";
import styles from "../../styles/features/manage-booking/code-dialog.module.css";

const RESEND_SECONDS = 30;

const CHECK_ERRORS: Record<Exclude<CodeCheck, "verified">, string> = {
  wrong_code: "That code isn’t right. Check the email and try again.",
  expired: "That code has expired. Send a new code.",
  too_many_attempts: "Too many tries. Send a new code.",
};

const getSendError = (error: unknown) =>
  getErrorMessage(error) === "too_many_codes"
    ? "You’ve asked for a lot of codes. Try again in an hour."
    : "We couldn’t send a code. Try again.";

interface CodeDialogProps {
  token: string;
  action: "reschedule" | "cancel";
  onClose: () => void;
  onVerified: () => void;
}

export const CodeDialog = ({
  token,
  action,
  onClose,
  onVerified,
}: CodeDialogProps) => {
  const [send, { isLoading: isSending }] = useSendBookingCodeMutation();
  const [verify, { isLoading: isChecking }] = useVerifyBookingCodeMutation();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);

  const requestCode = useCallback(async () => {
    setError("");

    try {
      const sent = await send(token).unwrap();

      setEmail(sent.email);
      setCode("");
      setResendIn(RESEND_SECONDS);
    } catch (sendError) {
      setError(getSendError(sendError));
    }
  }, [send, token]);

  useEffect(() => {
    void requestCode();
  }, [requestCode]);

  useEffect(() => {
    if (resendIn <= 0) return;

    const timer = window.setTimeout(() => setResendIn(resendIn - 1), 1000);

    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const check = async (event: FormEvent) => {
    event.preventDefault();

    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from the email.");

      return;
    }

    setError("");

    try {
      const result = await verify({ token, code }).unwrap();

      if (result === "verified") return onVerified();

      if (result !== "wrong_code") setCode("");

      setError(CHECK_ERRORS[result]);
    } catch {
      setError("Something went wrong. Try again.");
    }
  };

  const getResendLabel = () => {
    if (isSending) return "Sending…";

    return resendIn > 0 ? `Send a new code (${resendIn}s)` : "Send a new code";
  };

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div
      onClick={isChecking ? undefined : onClose}
      data-mb-anim="1"
      className={dialog.scrim}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="mb-code-t"
        noValidate
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => void check(event)}
        data-mb-anim="1"
        className={dialog.panel}
      >
        <h3 id="mb-code-t" className={dialog.title}>
          Check your email
        </h3>
        <p className={dialog.text}>
          {email
            ? `We sent a 6-digit code to ${email}. Enter it to ${action} your booking.`
            : "Sending a code to the email on this booking…"}
        </p>
        <label htmlFor="mb-code" className={styles.label}>
          6-digit code
        </label>
        <input
          id="mb-code"
          value={code}
          onChange={({ target }) =>
            setCode(target.value.replace(/\D/g, "").slice(0, 6))
          }
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? "mb-code-e" : undefined}
          className={joinClassNames(styles.input, !!error && styles.inputError)}
        />
        {!!error && (
          <p id="mb-code-e" role="alert" className={dialog.error}>
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={() => void requestCode()}
          disabled={resendIn > 0 || isSending}
          className={styles.resend}
        >
          {getResendLabel()}
        </button>
        <div className={dialog.actions}>
          <button
            type="button"
            onClick={onClose}
            disabled={isChecking}
            className={dialog.cancel}
          >
            Not now
          </button>
          <button
            type="submit"
            disabled={isChecking}
            className={dialog.confirm}
          >
            {isChecking ? "Checking…" : "Confirm"}
          </button>
        </div>
      </form>
    </div>
  );
};
