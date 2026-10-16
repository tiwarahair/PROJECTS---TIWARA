import { useFormState } from "react-hook-form";
import type { CSSProperties } from "react";
import { AppleLogo, GoogleLogo } from "../../components/icons/brand-icons";
import { joinClassNames } from "../../utils/class-names";
import {
  checkPassword,
  getPasswordMin,
  getPasswordView,
} from "../../utils/password";
import { EMPTY_PASSWORD } from "./forms";
import type { PasswordState } from "./state";
import type { AccountController } from "./use-account";
import styles from "../../styles/features/account/security-section.module.css";
import ui from "../../styles/features/account/ui.module.css";

const getPasswordStatus = ({ has, changed }: PasswordState) => {
  if (!has) return "Not set. You log in with Google.";

  return changed ? "Changed just now" : "Last changed 4 months ago";
};

/** Login & security: password (change / set, with the strength meter), Google / Apple, log out everywhere. */
export const SecuritySection = ({
  account: { state, actions, forms },
}: {
  account: AccountController;
}) => {
  const { password, profile, googleConnected, appleConnected } = state;
  const { setState, showToast } = actions;

  const { register, watch, reset, clearErrors, control } = forms.password;
  const { errors } = useFormState({ control });

  const currentField = register("current");
  const nextField = register("next");

  const check = checkPassword(watch("next"), {
    min: getPasswordMin("client"),
    first: profile.first,
    last: profile.last,
    email: profile.email,
  });

  const meter = getPasswordView(check, { show: !!errors.next });

  const methods =
    (password.has ? 1 : 0) +
    (googleConnected ? 1 : 0) +
    (appleConnected ? 1 : 0);

  const openPassword = () =>
    setState(
      ({ password: current }) => ({ password: { ...current, open: true } }),
      () => actions.focusLater("password"),
    );

  const socials = [
    {
      key: "googleConnected" as const,
      name: "Google",
      Logo: GoogleLogo,
      on: googleConnected,
      subtitle: profile.email,
    },
    {
      key: "appleConnected" as const,
      name: "Apple",
      Logo: AppleLogo,
      on: appleConnected,
      subtitle: "",
    },
  ];

  // the meter colours come from the password checker
  const segmentStyle = (background: string) =>
    ({ "--seg-bg": background }) as CSSProperties;

  const messageStyle = {
    "--msg-colour": meter.messageColour,
    "--msg-weight": meter.messageWeight,
  } as CSSProperties;

  const labelStyle = { "--label-colour": meter.labelColour } as CSSProperties;

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
                  password.has ? ui.valueOn : ui.valueOff,
                )}
              >
                {getPasswordStatus(password)}
              </div>
            </div>
            {!password.open && (
              <button className={ui.outlineButton} onClick={openPassword}>
                {password.has ? "Change password" : "Set a password"}
              </button>
            )}
          </div>
          {password.open && (
            <div
              className={styles.pwForm}
              data-screen-label="Change password open"
            >
              {password.has && (
                <label className={ui.label}>
                  Current password{" "}
                  <input
                    className={joinClassNames(
                      ui.input,
                      errors.current ? ui.inputErr : ui.inputOk,
                    )}
                    type={password.show ? "text" : "password"}
                    name={currentField.name}
                    ref={currentField.ref}
                    onChange={(event) => {
                      clearErrors("current");
                      void currentField.onChange(event);
                    }}
                    autoComplete="current-password"
                    aria-invalid={errors.current ? "true" : "false"}
                    aria-describedby="ac-e-cur"
                  />
                  <span className={ui.error} id="ac-e-cur">
                    {errors.current?.message}
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
                      meter.hasError ? ui.inputErr : ui.inputOk,
                    )}
                    id="ac-newpw"
                    type={password.show ? "text" : "password"}
                    {...nextField}
                    onBlur={(event) => {
                      if (event.target.value) void nextField.onBlur(event);
                    }}
                    autoComplete="new-password"
                    aria-invalid={meter.hasError}
                    aria-describedby="ac-pw-msg"
                  />
                  <button
                    className={styles.pwToggle}
                    onClick={() =>
                      setState(({ password: current }) => ({
                        password: { ...current, show: !current.show },
                      }))
                    }
                    aria-pressed={password.show}
                  >
                    {password.show ? "Hide" : "Show"}
                  </button>
                </div>
                <div className={styles.meter} aria-hidden="true">
                  {[meter.bar1Colour, meter.bar2Colour, meter.bar3Colour].map(
                    (background, index) => (
                      <span
                        key={index}
                        className={joinClassNames(
                          styles.meterSeg,
                          styles.meterSegColour,
                        )}
                        style={segmentStyle(background)}
                      ></span>
                    ),
                  )}
                </div>
                <div className={styles.meterText}>
                  <span
                    className={styles.meterMessage}
                    id="ac-pw-msg"
                    style={messageStyle}
                  >
                    {meter.message}
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
                {meter.showWarning && (
                  <div className={ui.smallMuted}>{meter.warning}</div>
                )}
              </div>
              <div className={ui.actions}>
                <button
                  className={ui.save}
                  onClick={() => void actions.savePassword()}
                >
                  Save
                </button>
                <button
                  className={ui.cancel}
                  onClick={() => {
                    reset(EMPTY_PASSWORD);

                    setState(({ password: current }) => ({
                      password: { ...current, open: false },
                    }));
                  }}
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
        {socials.map(({ key, name, Logo, on, subtitle }) => {
          const isLast = on && methods <= 1;

          return (
            <div key={key} className={styles.social}>
              <span className={styles.socialMark} aria-hidden="true">
                <Logo size={18} />
              </span>
              <div className={styles.socialText}>
                <div className={ui.itemTitle}>{name}</div>
                <div className={styles.socialSub}>
                  {on
                    ? `Connected${subtitle ? ` · ${subtitle}` : ""}`
                    : "Not connected"}
                </div>
              </div>
              {!isLast && (
                <button
                  className={ui.outlineButton}
                  onClick={() => {
                    setState(
                      key === "googleConnected"
                        ? { googleConnected: !on }
                        : { appleConnected: !on },
                    );

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
          onClick={() => actions.openDialog({ kind: "logoutAll" })}
        >
          Log out everywhere
        </button>
      </div>
    </section>
  );
};
