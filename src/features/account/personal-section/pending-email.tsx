import { EMPTY_CODE } from "../state";
import type { EditFormController } from "./use-edit-form";
import styles from "../../../styles/features/account/personal-section/pending-email.module.css";
import shared from "../../../styles/features/account/personal-section/index.module.css";

interface PendingEmailProps {
  personal: EditFormController;
}

export const PendingEmail = ({
  personal: {
    state: { profile, pendingEmail },
    actions: { setState, focusLater, showToast, stopResendCountdown },
    form: { reset },
  },
}: PendingEmailProps) => (
  <div className={styles.pending} data-screen-label="Email change pending">
    <div className={styles.pendingText}>
      <span className={styles.pendingDot} aria-hidden="true"></span>
      <span>
        {"Change to "}
        {pendingEmail}
        {" waiting for confirmation"}
      </span>
    </div>
    <div className={styles.pendingActions}>
      <button
        className={shared.linkButton}
        onClick={() => {
          reset({ ...profile, email: pendingEmail ?? "" });

          setState(
            {
              edit: "email",
              emailStep: "code",
              code: EMPTY_CODE,
              codeError: "",
            },
            () => focusLater("code"),
          );
        }}
      >
        Enter code
      </button>
      <button
        className={styles.linkButtonQuiet}
        onClick={() => {
          stopResendCountdown();
          setState({ pendingEmail: "", resendIn: 0 });
          showToast("Email change cancelled");
        }}
      >
        Cancel change
      </button>
    </div>
  </div>
);
