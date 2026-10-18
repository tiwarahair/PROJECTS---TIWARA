import { joinClassNames } from "../../../utils/class-names";
import { EMPTY_CODE } from "../state";
import type { EditFormController } from "./use-edit-form";
import styles from "../../../styles/features/account/personal-section/code-step.module.css";
import shared from "../../../styles/features/account/personal-section/index.module.css";
import ui from "../../../styles/features/account/ui.module.css";

const getCodeBoxClass = (codeError: string, digit: string) => {
  if (codeError) return styles.codeBoxErr;

  return digit ? styles.codeBoxFilled : styles.codeBoxEmpty;
};

interface CodeStepProps {
  personal: EditFormController;
}

export const CodeStep = ({
  personal: {
    state: { code, codeError, shake, resendIn },
    refs,
    actions,
    form: { watch },
  },
}: CodeStepProps) => {
  const { setState, focusLater, showToast, saveEdit } = actions;
  const resendSeconds = String(resendIn).padStart(2, "0");

  return (
    <div className={styles.codeStep} data-screen-label="Email code step">
      <p className={styles.codeIntro}>
        We’ve sent a code to{" "}
        <strong className={ui.strong}>{watch("email")}</strong>.
      </p>
      <div
        className={joinClassNames(
          styles.codeBoxes,
          shake > 0 && styles.codeShake,
        )}
        onPaste={actions.pasteCode}
        role="group"
        aria-label="6-digit code"
      >
        {code.map((digit, index) => (
          <input
            key={`c${index}`}
            className={joinClassNames(
              styles.codeBox,
              getCodeBoxClass(codeError, digit),
            )}
            ref={refs.code[index]}
            value={digit}
            onChange={(event) => actions.setCode(index, event.target.value)}
            onFocus={(event) => event.target.select()}
            onKeyDown={(event) => actions.codeKey(index, event)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            aria-label={`Digit ${index + 1}`}
          />
        ))}
      </div>
      <div className={styles.codeError} role="alert">
        {codeError}
      </div>
      <div className={styles.codeLinks}>
        <button
          className={joinClassNames(
            styles.resend,
            resendIn > 0 ? styles.resendWait : styles.resendReady,
          )}
          onClick={() => {
            if (resendIn > 0) return;

            setState({ resendIn: 30, codeError: "", code: EMPTY_CODE });
            actions.startResendCountdown();
            showToast("We sent a new code");
          }}
          aria-disabled={resendIn > 0 ? "true" : "false"}
        >
          {resendIn > 0 ? `Resend code in 0:${resendSeconds}` : "Resend code"}
        </button>
        <button
          className={shared.linkButton}
          onClick={() => {
            actions.stopResendCountdown();

            setState(
              { emailStep: "", codeError: "", pendingEmail: "", resendIn: 0 },
              () => focusLater("edit"),
            );
          }}
        >
          Use a different email
        </button>
      </div>
      <div className={styles.codeActions}>
        <button className={shared.continue} onClick={saveEdit}>
          Confirm
        </button>
        <button
          className={ui.cancel}
          onClick={() => {
            actions.stopResendCountdown();
            setState({ edit: null, emailStep: "", codeError: "" });
          }}
        >
          Do this later
        </button>
      </div>
    </div>
  );
};
