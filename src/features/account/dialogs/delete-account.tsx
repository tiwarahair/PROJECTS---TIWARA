import { useState } from "react";
import {
  deleteClientAccount,
  sendAccountCode,
} from "../../../lib/client-account";
import { getErrorMessage } from "../../../stores/api-slice";
import { joinClassNames } from "../../../utils/class-names";
import type { AccountController } from "../use-account";
import shared from "../../../styles/features/account/dialogs/index.module.css";
import styles from "../../../styles/features/account/dialogs/delete.module.css";
import ui from "../../../styles/features/account/ui.module.css";

const CODE_FAILURES: Record<string, string> = {
  wrong_code: "That code isn’t right.",
  expired: "That code has expired. Send a new one.",
  too_many_attempts: "Too many tries. Send a new code.",
  too_many_codes: "Too many codes sent. Try again in an hour.",
};

interface DeleteAccountProps {
  account: AccountController;
  onBlocked: () => void;
}

export const DeleteAccount = ({
  account: { state, refs, actions },
  onBlocked,
}: DeleteAccountProps) => {
  const { deleteText } = state;
  const [isDeleting, setDeleting] = useState(false);
  const [codeEmail, setCodeEmail] = useState(""); // set once the session is over a day old and the server asked for an emailed code
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");

  const canDelete =
    deleteText.trim() === "DELETE" &&
    !isDeleting &&
    (!codeEmail || code.length === 6);

  const sendCode = async () => {
    try {
      setCodeEmail(await sendAccountCode());
      setCodeError("");
    } catch (error) {
      setCodeError(
        CODE_FAILURES[getErrorMessage(error)] ??
          "The code couldn’t be sent. Try again.",
      );
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);

    try {
      await deleteClientAccount(codeEmail ? code : undefined);
    } catch (error) {
      const reason = getErrorMessage(error);

      setDeleting(false);

      if (reason === "blocked") return onBlocked();

      if (reason === "code_needed") return sendCode();

      if (CODE_FAILURES[reason]) return setCodeError(CODE_FAILURES[reason]);

      return actions.showToast("Your account couldn’t be deleted. Try again");
    }

    actions.setState({ dialog: null, deleted: true });
    actions.endSession();
    actions.showToast("Your account has been deleted");
  };

  return (
    <div data-screen-label="Delete account allowed">
      <h2 className={shared.title} id="ac-dlg-t">
        Delete your account?
      </h2>
      <p className={styles.deleteLead}>This can’t be undone.</p>
      <div className={styles.deleteHeading}>We’ll delete</div>
      <ul className={styles.deleteList}>
        <li>Your name and contact details</li>
        <li>Your favourites and saved addresses</li>
        <li>Allergies and notes you’ve shared with stylists</li>
        <li>Your saved cards</li>
      </ul>
      <div className={styles.keepHeading}>We’ll keep, without your details</div>
      <p className={styles.keepText}>
        Payment records, for tax. Recent payments keep your name and email for
        up to 120 days in case one is disputed.
      </p>
      <label className={styles.deleteLabel}>
        Type DELETE to confirm{" "}
        <input
          className={styles.deleteInput}
          ref={refs.deleteConfirm}
          value={deleteText}
          onChange={(event) =>
            actions.setState({ deleteText: event.target.value.toUpperCase() })
          }
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck="false"
        />
      </label>
      {!!codeEmail && (
        <div className={styles.codeBlock}>
          <label className={styles.deleteLabel}>
            Code from your email
            <input
              className={styles.deleteInput}
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                setCodeError("");
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-invalid={codeError ? "true" : "false"}
              aria-describedby="ac-delete-code-help"
            />
          </label>
          <span className={styles.deleteDetail} id="ac-delete-code-help">
            {`It’s been a while since you logged in, so we emailed a code to ${codeEmail}.`}
          </span>
          <button
            className={joinClassNames(ui.quietButton, styles.resendCode)}
            onClick={() => void sendCode()}
          >
            Resend code
          </button>
        </div>
      )}
      {!!codeError && (
        <span className={ui.error} role="alert">
          {codeError}
        </span>
      )}
      <div className={shared.actions}>
        <button className={shared.secondary} onClick={actions.closeDialog}>
          Cancel
        </button>
        <button
          className={joinClassNames(
            styles.deleteButton,
            canDelete ? styles.deleteReady : styles.deleteBlocked,
          )}
          onClick={() => {
            if (canDelete) void deleteAccount();
          }}
          disabled={!canDelete}
        >
          {isDeleting ? "Deleting…" : "Delete account"}
        </button>
      </div>
    </div>
  );
};
