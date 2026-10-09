import type { CSSProperties } from "react";
import type { PasswordView } from "../../utils/password";
import styles from "./password-meter.module.css";

export interface PasswordMeterProps {
  /** Id for aria-describedby on the password input. */
  id: string;
  view: PasswordView;
}

/** The message, "15+ characters" rule, strength label + bars and zxcvbn warning under a password field. */
export const PasswordMeter = ({ id, view }: PasswordMeterProps) => {
  const {
    msgOn,
    hasErr,
    msg,
    msgW,
    msgC,
    ruleC,
    muteC,
    labelC,
    okLen,
    rule,
    ruleSr,
    typed,
    label,
    segs,
    warnOn,
    warn,
  } = view;
  // runtime palette colours from getPasswordView
  const paletteStyle = {
    "--pm-msg-weight": msgW,
    "--pm-msg-colour": msgC,
    "--pm-rule-colour": ruleC,
    "--pm-mute-colour": muteC,
    "--pm-label-colour": labelC,
  } as CSSProperties;
  return (
    <div id={id} className={styles.help} style={paletteStyle}>
      {msgOn && (
        <div role={hasErr ? "alert" : "note"} className={styles.message}>
          {msg}
        </div>
      )}
      <div aria-live="polite" className={styles.ruleRow}>
        <div className={styles.rule}>
          {okLen ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={styles.ruleIcon}
            >
              <path d="M5 12l5 5L20 7"></path>
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              aria-hidden="true"
              className={styles.ruleIcon}
            >
              <path d="M18 6 6 18M6 6l12 12"></path>
            </svg>
          )}
          <span>
            {rule}
            <span className={styles.srOnly}>{", " + ruleSr}</span>
          </span>
        </div>
        {typed && (
          <div className={styles.strength}>
            <span className={styles.strengthLabel}>
              Password strength:{" "}
              <strong className={styles.strengthValue}>{label}</strong>
            </span>
            <span aria-hidden="true" className={styles.bars}>
              {segs.map(({ key, bg }) => (
                // pm.s1–s3: each bar's colour
                <span
                  key={key}
                  className={styles.bar}
                  style={{ "--pm-bar-colour": bg } as CSSProperties}
                ></span>
              ))}
            </span>
          </div>
        )}
      </div>
      {warnOn && (
        <div aria-live="polite" className={styles.warning}>
          {warn}
        </div>
      )}
    </div>
  );
};
