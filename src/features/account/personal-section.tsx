import { Fragment } from "react";
import type { ChangeEvent } from "react";
import { resolveAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import type { EditKey } from "./account-logic";
import type { Profile } from "./account-data";
import type { AccountController } from "./use-account";
import styles from "./personal-section.module.css";
import ui from "./account-ui.module.css";

const EMPTY_CODE = ["", "", "", "", "", ""];

const getCodeBoxClass = (codeError: string, digit: string) => {
  if (codeError) return styles.codeBoxErr;

  return digit ? styles.codeBoxFilled : styles.codeBoxEmpty;
};

interface PersonalSectionProps {
  account: AccountController;
  initials: string;
}

/** Personal details: profile photo, name / email / mobile rows with inline edit, and the email-change code step. */
export const PersonalSection = ({
  account: { state, refs, actions },
  initials,
}: PersonalSectionProps) => {
  const {
    profile,
    edit,
    draft,
    fieldErrors,
    emailStep,
    code,
    codeError,
    shake,
    resendIn,
  } = state;

  const { setState, focusLater, showToast, saveEdit } = actions;
  const codeStep = edit === "email" && emailStep === "code";
  const resendSeconds = String(resendIn).padStart(2, "0");

  const rows: [EditKey, string, string][] = [
    ["name", "Full name", `${profile.first} ${profile.last}`],
    ["email", "Email", profile.email],
    ["mobile", "Mobile", `+44 ${profile.mobile}`],
  ];

  const setDraft =
    (key: keyof Profile) => (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;

      setState(({ draft: current, fieldErrors: errors }) => ({
        draft: { ...current, [key]: value },
        fieldErrors: { ...errors, [key]: "" },
      }));
    };

  const borderOf = (key: string) =>
    fieldErrors[key] ? ui.inputErr : ui.inputOk;

  const cancelEdit = () => {
    actions.stopResendCountdown();
    setState({ edit: null, fieldErrors: {}, emailStep: "", codeError: "" });
  };

  return (
    <section data-screen-label="Account: Personal details">
      <div className={ui.list}>
        <div className={ui.row} data-screen-label="Profile photo">
          <div className={styles.photoHead}>
            <div className={ui.rowLabel}>
              Profile photo
              <span className={ui.optional}>(optional)</span>
            </div>
            <div className={styles.photoBody}>
              <button
                className={styles.photoButton}
                onClick={() => refs.file.current?.click()}
                aria-label={state.photo ? "Change photo" : "Upload photo"}
              >
                <span className={styles.photoAvatar} aria-hidden="true">
                  {state.photo ? (
                    <img
                      className={styles.avatarImage}
                      src={resolveAssetUrl(state.photo)}
                      alt=""
                    />
                  ) : (
                    initials
                  )}
                </span>
                <span className={styles.photoBadge} aria-hidden="true">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"></path>
                  </svg>
                </span>
              </button>
              <div className={ui.buttonRow}>
                {state.photo && (
                  <button
                    className={ui.quietButton}
                    onClick={() => {
                      setState({ photo: null, photoError: "" });
                      showToast("Photo removed");
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                className={styles.fileInput}
                ref={refs.file}
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                onChange={actions.onPhoto}
                aria-label="Upload profile photo"
              />
            </div>
          </div>
          <div className={styles.photoHint}>
            Helps your stylist recognise you. JPG, JPEG or PNG, up to 10MB.
          </div>
          <div className={ui.error} role="alert">
            {state.photoError}
          </div>
        </div>
        {rows.map(([key, label, value]) => {
          const isView = edit !== key;
          const isLocked = !!edit && edit !== key;

          return (
            <Fragment key={key}>
              <div className={ui.row}>
                <div className={styles.detailHead}>
                  <div className={ui.rowLabel}>{label}</div>
                  <div className={styles.detailBody}>
                    {isView && (
                      <>
                        <div className={joinClassNames(ui.value, ui.valueOn)}>
                          {value}
                        </div>
                        {key === "email" &&
                          !!state.pendingEmail &&
                          edit !== "email" && (
                            <div
                              className={styles.pending}
                              data-screen-label="Email change pending"
                            >
                              <div className={styles.pendingText}>
                                <span
                                  className={styles.pendingDot}
                                  aria-hidden="true"
                                ></span>
                                <span>
                                  {"Change to "}
                                  {state.pendingEmail}
                                  {" waiting for confirmation"}
                                </span>
                              </div>
                              <div className={styles.pendingActions}>
                                <button
                                  className={styles.linkButton}
                                  onClick={() =>
                                    setState(
                                      ({ profile: current, pendingEmail }) => ({
                                        edit: "email",
                                        emailStep: "code",
                                        draft: {
                                          ...current,
                                          email: pendingEmail ?? "",
                                        },
                                        code: EMPTY_CODE,
                                        codeError: "",
                                        fieldErrors: {},
                                      }),
                                      () => focusLater("code"),
                                    )
                                  }
                                >
                                  Enter code
                                </button>
                                <button
                                  className={styles.linkButtonQuiet}
                                  onClick={() => {
                                    actions.stopResendCountdown();
                                    setState({ pendingEmail: "", resendIn: 0 });
                                    showToast("Email change cancelled");
                                  }}
                                >
                                  Cancel change
                                </button>
                              </div>
                            </div>
                          )}
                      </>
                    )}
                    {!isView && key === "email" && !codeStep && (
                      <div
                        className={styles.emailEdit}
                        data-screen-label="Email: editing"
                      >
                        <div>
                          <div className={styles.currentLabel}>
                            Current email
                          </div>
                          <div className={styles.currentValue}>
                            {profile.email}
                          </div>
                        </div>
                        <div className={ui.field}>
                          <label
                            className={ui.labelText}
                            htmlFor="ac-new-email"
                          >
                            New email
                          </label>
                          <input
                            className={joinClassNames(
                              ui.input,
                              borderOf("email"),
                            )}
                            id="ac-new-email"
                            ref={refs.email}
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            value={draft.email}
                            onChange={setDraft("email")}
                            onKeyDown={(event) => {
                              if (event.key !== "Enter") return;

                              event.preventDefault();
                              saveEdit();
                            }}
                            aria-invalid={fieldErrors.email ? "true" : "false"}
                            aria-describedby="ac-e-email"
                          />
                          <div
                            className={ui.error}
                            id="ac-e-email"
                            role="alert"
                          >
                            {fieldErrors.email}
                          </div>
                        </div>
                        <div className={ui.actions}>
                          <button
                            className={styles.continue}
                            onClick={saveEdit}
                          >
                            Continue
                          </button>
                          <button className={ui.cancel} onClick={cancelEdit}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {!isView && codeStep && (
                      <div
                        className={styles.codeStep}
                        data-screen-label="Email code step"
                      >
                        <p className={styles.codeIntro}>
                          We’ve sent a code to{" "}
                          <strong className={ui.strong}>{draft.email}</strong>.
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
                              onChange={(event) =>
                                actions.setCode(index, event.target.value)
                              }
                              onFocus={(event) => event.target.select()}
                              onKeyDown={(event) =>
                                actions.codeKey(index, event)
                              }
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
                              resendIn > 0
                                ? styles.resendWait
                                : styles.resendReady,
                            )}
                            onClick={() => {
                              if (resendIn > 0) return;

                              setState({
                                resendIn: 30,
                                codeError: "",
                                code: EMPTY_CODE,
                              });

                              actions.startResendCountdown();
                              showToast("We sent a new code");
                            }}
                            aria-disabled={resendIn > 0 ? "true" : "false"}
                          >
                            {resendIn > 0
                              ? `Resend code in 0:${resendSeconds}`
                              : "Resend code"}
                          </button>
                          <button
                            className={styles.linkButton}
                            onClick={() => {
                              actions.stopResendCountdown();

                              setState(
                                {
                                  emailStep: "",
                                  codeError: "",
                                  pendingEmail: "",
                                  resendIn: 0,
                                },
                                () => focusLater("edit"),
                              );
                            }}
                          >
                            Use a different email
                          </button>
                        </div>
                        <div className={styles.codeActions}>
                          <button
                            className={styles.continue}
                            onClick={saveEdit}
                          >
                            Confirm
                          </button>
                          <button
                            className={ui.cancel}
                            onClick={() => {
                              actions.stopResendCountdown();

                              setState({
                                edit: null,
                                emailStep: "",
                                codeError: "",
                              });
                            }}
                          >
                            Do this later
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {isView && (
                    <button
                      className={joinClassNames(
                        ui.outlineButton,
                        isLocked && ui.dimmed,
                      )}
                      onClick={() =>
                        setState(
                          {
                            edit: key,
                            draft: {
                              ...profile,
                              email: key === "email" ? "" : profile.email,
                            },
                            fieldErrors: {},
                            emailStep: "",
                          },
                          () => focusLater("edit"),
                        )
                      }
                      aria-label={`Edit ${label.toLowerCase()}`}
                      disabled={isLocked}
                    >
                      Edit
                    </button>
                  )}
                </div>
                {!isView && key === "name" && (
                  <div className={styles.nameGrid}>
                    <label className={ui.label}>
                      First name{" "}
                      <input
                        className={joinClassNames(ui.input, borderOf("first"))}
                        ref={refs.first}
                        value={draft.first}
                        onChange={setDraft("first")}
                        autoComplete="given-name"
                        aria-invalid={fieldErrors.first ? "true" : "false"}
                        aria-describedby="ac-e-first"
                      />
                      <span className={ui.error} id="ac-e-first">
                        {fieldErrors.first}
                      </span>
                    </label>
                    <label className={ui.label}>
                      Last name{" "}
                      <input
                        className={joinClassNames(ui.input, borderOf("last"))}
                        value={draft.last}
                        onChange={setDraft("last")}
                        autoComplete="family-name"
                        aria-invalid={fieldErrors.last ? "true" : "false"}
                        aria-describedby="ac-e-last"
                      />
                      <span className={ui.error} id="ac-e-last">
                        {fieldErrors.last}
                      </span>
                    </label>
                  </div>
                )}
                {!isView && key === "mobile" && (
                  <div className={styles.editField}>
                    <label className={ui.labelText} htmlFor="ac-mob">
                      Mobile
                    </label>
                    <div
                      className={joinClassNames(
                        styles.mobileWrap,
                        borderOf("mobile"),
                      )}
                    >
                      <span className={styles.prefix}>+44</span>
                      <input
                        className={styles.mobileInput}
                        id="ac-mob"
                        ref={refs.mobile}
                        type="tel"
                        value={draft.mobile}
                        onChange={setDraft("mobile")}
                        autoComplete="tel-national"
                        aria-invalid={fieldErrors.mobile ? "true" : "false"}
                        aria-describedby="ac-e-mob"
                      />
                    </div>
                    <div className={styles.mobileError} id="ac-e-mob">
                      {fieldErrors.mobile}
                    </div>
                  </div>
                )}
                {!isView && key !== "email" && (
                  <div className={styles.editActions}>
                    <button className={styles.saveEdit} onClick={saveEdit}>
                      Save
                    </button>
                    <button className={ui.cancel} onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </Fragment>
          );
        })}
      </div>
      <p className={styles.footnote}>
        Stylists you’ve booked with see these details so they can contact you
        about your appointments.
      </p>
    </section>
  );
};
