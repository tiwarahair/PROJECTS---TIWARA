import type { CSSProperties } from "react";
import { Check, X } from "lucide-react";
import type { PasswordView } from "../../utils/password";
import styles from "../../styles/components/password-meter/password-meter.module.css";

export interface PasswordMeterProps {
  /** Id for aria-describedby on the password input. */
  id: string;
  view: PasswordView;
  /** Onboarding marks any error-coloured message as an alert; by default only shown errors are. */
  messageRole?: "alert" | "note";
}

/** The message, "15+ characters" rule, strength label + bars and zxcvbn warning under a password field. */
export const PasswordMeter = ({
  id,
  view,
  messageRole,
}: PasswordMeterProps) => {
  const {
    showMessage,
    hasError,
    message,
    messageWeight,
    messageColour,
    ruleColour,
    mutedColour,
    labelColour,
    lengthMet,
    rule,
    ruleScreenReaderText,
    typed,
    label,
    segments,
    showWarning,
    warning,
  } = view;

  // runtime palette colours from getPasswordView
  const paletteStyle = {
    "--pm-msg-weight": messageWeight,
    "--pm-msg-colour": messageColour,
    "--pm-rule-colour": ruleColour,
    "--pm-mute-colour": mutedColour,
    "--pm-label-colour": labelColour,
  } as CSSProperties;

  return (
    <div id={id} className={styles.help} style={paletteStyle}>
      {showMessage && (
        <div
          role={messageRole ?? (hasError ? "alert" : "note")}
          className={styles.message}
        >
          {message}
        </div>
      )}
      <div aria-live="polite" className={styles.ruleRow}>
        <div className={styles.rule}>
          {lengthMet ? (
            <Check size={14} strokeWidth={2.4} className={styles.ruleIcon} />
          ) : (
            <X size={14} strokeWidth={2.4} className={styles.ruleIcon} />
          )}
          <span>
            {rule}
            <span className={styles.srOnly}>{`, ${ruleScreenReaderText}`}</span>
          </span>
        </div>
        {typed && (
          <div className={styles.strength}>
            <span className={styles.strengthLabel}>
              Password strength:{" "}
              <strong className={styles.strengthValue}>{label}</strong>
            </span>
            <span aria-hidden="true" className={styles.bars}>
              {segments.map(({ key, background }) => (
                <span
                  key={key}
                  className={styles.bar}
                  style={{ "--pm-bar-colour": background } as CSSProperties}
                ></span>
              ))}
            </span>
          </div>
        )}
      </div>
      {showWarning && (
        <div aria-live="polite" className={styles.warning}>
          {warning}
        </div>
      )}
    </div>
  );
};
