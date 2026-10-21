import { Check } from "lucide-react";
import { joinClassNames } from "../../../utils/class-names";
import type { CodeRow, CodeTarget } from "../state";
import type { EditFormController } from "./use-edit-form";
import styles from "../../../styles/features/account/personal-section/code-step.module.css";
import shared from "../../../styles/features/account/personal-section/index.module.css";
import ui from "../../../styles/features/account/ui.module.css";

const getCodeBoxClass = ({ error, confirmed }: CodeRow, digit: string) => {
  if (confirmed) return styles.codeBoxDone;

  if (error) return styles.codeBoxErr;

  return digit ? styles.codeBoxFilled : styles.codeBoxEmpty;
};

interface CodeStepProps {
  personal: EditFormController;
}

export const CodeStep = ({
  personal: {
    state: { profile, pendingEmail = "", codes, resendIn },
    refs,
    actions,
  },
}: CodeStepProps) => {
  const { setState, focusLater, saveEdit } = actions;
  const resendSeconds = String(resendIn).padStart(2, "0");

  const rows: [CodeTarget, string][] = [
    ["current", profile.email],
    ["next", pendingEmail],
  ];

  return (
    <div className={styles.codeStep} data-screen-label="Email code step">
      <p className={styles.codeIntro}>
        We’ve sent a code to each address. Enter both to change your email.
      </p>
      {rows.map(([target, email]) => {
        const row = codes[target];
        const labelId = `ac-code-${target}`;

        return (
          <div key={target} className={styles.codeRow}>
            <p className={styles.codeLabel} id={labelId}>
              {`Code sent to ${email}`}
            </p>
            <div className={styles.codeLine}>
              <div
                className={joinClassNames(
                  styles.codeBoxes,
                  row.shake > 0 && styles.codeShake,
                )}
                onPaste={(event) => actions.pasteCode(target, event)}
                role="group"
                aria-labelledby={labelId}
              >
                {row.digits.map((digit, index) => (
                  <input
                    key={`c${index}`}
                    className={joinClassNames(
                      styles.codeBox,
                      getCodeBoxClass(row, digit),
                    )}
                    ref={refs.codes[target][index]}
                    value={digit}
                    disabled={row.confirmed}
                    onChange={(event) =>
                      actions.setCode(target, index, event.target.value)
                    }
                    onFocus={(event) => event.target.select()}
                    onKeyDown={(event) => actions.codeKey(target, index, event)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    aria-label={`${target === "current" ? "Current" : "New"} email digit ${index + 1}`}
                  />
                ))}
              </div>
              {row.confirmed && (
                <Check
                  className={styles.codeTick}
                  size={22}
                  strokeWidth={2.4}
                  role="img"
                  aria-label="Confirmed"
                />
              )}
            </div>
            <div className={styles.codeError} role="alert">
              {row.error}
            </div>
          </div>
        );
      })}
      <div className={styles.codeLinks}>
        <button
          className={joinClassNames(
            styles.resend,
            resendIn > 0 ? styles.resendWait : styles.resendReady,
          )}
          onClick={() => {
            if (resendIn === 0) void actions.resendCodes();
          }}
          aria-disabled={resendIn > 0 ? "true" : "false"}
        >
          {resendIn > 0 ? `Resend codes in 0:${resendSeconds}` : "Resend codes"}
        </button>
        <button
          className={shared.linkButton}
          onClick={() => {
            actions.stopResendCountdown();

            setState({ emailStep: "", pendingEmail: "", resendIn: 0 }, () =>
              focusLater("edit"),
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
            setState({ edit: null, emailStep: "" });
          }}
        >
          Do this later
        </button>
      </div>
    </div>
  );
};
