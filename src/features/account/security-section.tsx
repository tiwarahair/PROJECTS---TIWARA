import type { CSSProperties } from "react";
import { joinClassNames } from "../../utils/class-names";
import {
  checkPassword,
  getPasswordMin,
  getPasswordView,
} from "../../utils/password";
import type { AccountController } from "./use-account";
import styles from "./security-section.module.css";
import ui from "./account-ui.module.css";

/** Login & security: password (change / set, with the strength meter), Google / Apple, log out everywhere. */
export const SecuritySection = ({
  account: { state, refs, actions },
}: {
  account: AccountController;
}) => {
  const { pw, me, gg, ap } = state;
  const { setState, showToast } = actions;
  const check = checkPassword(pw.next, {
    min: getPasswordMin("client"),
    first: me.first,
    last: me.last,
    email: me.email,
  });
  const meter = getPasswordView(check, {
    show: pw.tried || (pw.blur && check.typed),
  });
  const methods = (pw.has ? 1 : 0) + (gg ? 1 : 0) + (ap ? 1 : 0);
  const openPassword = () =>
    setState(
      ({ pw: current }) => ({ pw: { ...current, open: true } }),
      () => actions.focusLater("pw"),
    );
  const socials = [
    { key: "gg" as const, name: "Google", mark: "G", on: gg, sub: me.email },
    { key: "ap" as const, name: "Apple", mark: "A", on: ap, sub: "" },
  ];
  // the meter colours come from the password checker
  const segStyle = (background: string) =>
    ({ "--seg-bg": background }) as CSSProperties;
  const messageStyle = {
    "--msg-colour": meter.msgC,
    "--msg-weight": meter.msgW,
  } as CSSProperties;
  const labelStyle = { "--label-colour": meter.labelC } as CSSProperties;

  return (
    <section data-screen-label="Account: Login and security">
      <h2 className={ui.heading}>Password</h2>
      <div className={ui.list}>
        <div className={ui.row}>
          <div className={ui.rowHead}>
            <div className={ui.itemText}>
              <div className={ui.itemTitle}>Password</div>
              <div
                className={joinClassNames(
                  styles.pwValue,
                  pw.has ? ui.valueOn : ui.valueOff,
                )}
              >
                {!pw.has
                  ? "Not set. You log in with Google."
                  : pw.changed
                    ? "Changed just now"
                    : "Last changed 4 months ago"}
              </div>
            </div>
            {!pw.open && (
              <button className={ui.outlineButton} onClick={openPassword}>
                {pw.has ? "Change password" : "Set a password"}
              </button>
            )}
          </div>
          {pw.open && (
            <div
              className={styles.pwForm}
              data-screen-label="Change password open"
            >
              {pw.has && (
                <label className={ui.label}>
                  Current password{" "}
                  <input
                    className={joinClassNames(
                      ui.input,
                      pw.curErr ? ui.inputErr : ui.inputOk,
                    )}
                    ref={refs.current}
                    type={pw.show ? "text" : "password"}
                    value={pw.cur}
                    onChange={(event) => {
                      const { value } = event.target;
                      setState(({ pw: current }) => ({
                        pw: { ...current, cur: value, curErr: "" },
                      }));
                    }}
                    autoComplete="current-password"
                    aria-invalid={pw.curErr ? "true" : "false"}
                    aria-describedby="ac-e-cur"
                  />
                  <span className={ui.error} id="ac-e-cur">
                    {pw.curErr}
                  </span>
                </label>
              )}
              <div className={ui.field}>
                <label className={ui.labelText} htmlFor="ac-newpw">
                  New password
                </label>
                <div className={styles.pwWrap}>
                  <input
                    className={joinClassNames(
                      styles.pwInput,
                      meter.hasErr ? ui.inputErr : ui.inputOk,
                    )}
                    id="ac-newpw"
                    ref={refs.next}
                    type={pw.show ? "text" : "password"}
                    value={pw.next}
                    onChange={(event) => {
                      const { value } = event.target;
                      setState(({ pw: current }) => ({
                        pw: { ...current, next: value },
                      }));
                    }}
                    onBlur={() =>
                      setState(({ pw: current }) => ({
                        pw: { ...current, blur: true },
                      }))
                    }
                    autoComplete="new-password"
                    aria-invalid={meter.hasErr}
                    aria-describedby="ac-pw-msg"
                  />
                  <button
                    className={styles.pwToggle}
                    onClick={() =>
                      setState(({ pw: current }) => ({
                        pw: { ...current, show: !current.show },
                      }))
                    }
                    aria-pressed={pw.show}
                  >
                    {pw.show ? "Hide" : "Show"}
                  </button>
                </div>
                <div className={styles.meter} aria-hidden="true">
                  {[meter.s1, meter.s2, meter.s3].map((background, index) => (
                    <span
                      key={index}
                      className={joinClassNames(
                        styles.meterSeg,
                        styles.meterSegColour,
                      )}
                      style={segStyle(background)}
                    ></span>
                  ))}
                </div>
                <div className={styles.meterText}>
                  <span
                    className={styles.meterMessage}
                    id="ac-pw-msg"
                    style={messageStyle}
                  >
                    {meter.msg}
                  </span>
                  {meter.typed && (
                    <span
                      className={joinClassNames(ui.strong, styles.meterLabel)}
                      style={labelStyle}
                    >
                      {meter.label}
                    </span>
                  )}
                </div>
                {meter.warnOn && (
                  <div className={ui.smallMuted}>{meter.warn}</div>
                )}
              </div>
              <div className={ui.actions}>
                <button className={ui.save} onClick={actions.savePassword}>
                  Save
                </button>
                <button
                  className={ui.cancel}
                  onClick={() =>
                    setState(({ pw: current }) => ({
                      pw: {
                        ...current,
                        open: false,
                        cur: "",
                        next: "",
                        tried: false,
                        blur: false,
                        curErr: "",
                      },
                    }))
                  }
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <h2 className={ui.headingTop}>Connected accounts</h2>
      <p className={styles.intro}>
        Log in with Google or Apple instead of a password.
      </p>
      <div className={ui.list}>
        {socials.map(({ key, name, mark, on, sub }) => {
          const isLast = on && methods <= 1;
          return (
            <div key={key} className={styles.social}>
              <span className={styles.socialMark} aria-hidden="true">
                {mark}
              </span>
              <div className={styles.socialText}>
                <div className={ui.itemTitle}>{name}</div>
                <div className={styles.socialSub}>
                  {on
                    ? "Connected" + (sub ? " · " + sub : "")
                    : "Not connected"}
                </div>
              </div>
              {!isLast && (
                <button
                  className={ui.outlineButton}
                  onClick={() => {
                    setState(key === "gg" ? { gg: !on } : { ap: !on });
                    showToast(name + (on ? " disconnected" : " connected"));
                  }}
                >
                  {on ? "Disconnect" : "Connect"}
                </button>
              )}
              {isLast && (
                <button className={styles.setPassword} onClick={openPassword}>
                  Set a password first
                </button>
              )}
            </div>
          );
        })}
      </div>
      <h2 className={ui.headingTop}>Devices</h2>
      <div className={styles.devices}>
        <div className={ui.itemText}>
          <div className={ui.itemTitle}>Log out of all devices</div>
          <div className={ui.itemSub}>
            Including this one. You’ll need to log in again.
          </div>
        </div>
        <button
          className={ui.outlineButton}
          onClick={() => actions.openDialog({ k: "logoutAll" })}
        >
          Log out everywhere
        </button>
      </div>
    </section>
  );
};
