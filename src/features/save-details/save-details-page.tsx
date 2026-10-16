import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { usePasswordChecker } from "../../hooks/use-password-checker";
import { PasswordMeter } from "../../components/password-meter/password-meter";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { getSearchParams } from "../../utils/page-flags";
import { checkPassword, getPasswordView } from "../../utils/password";
import "../../styles/features/save-details/save-details-page-global.module.css";
import styles from "../../styles/features/save-details/save-details-page.module.css";

// clients need 15+ characters
const CLIENT_MIN = 15;
const SAVE_MS = 700;

interface SaveDetailsState {
  view: "form" | "done" | "expired";
  email: string;
  first: string;
  last: string;
  password: string;
  show: boolean;
  resent: boolean;
}

interface SaveDetailsForm {
  password: string;
}

const getInitialView = (
  invite: string,
  params: URLSearchParams,
): SaveDetailsState["view"] => {
  if (invite === "expired") return "expired";

  return params.get("state") === "done" ? "done" : "form";
};

/** ?invite=demo|expired, ?state=done, ?email / first / last / pw seed the page. */
const getInitialState = (): SaveDetailsState => {
  const params = getSearchParams();
  const invite = params.get("invite") || "demo";

  return {
    view: getInitialView(invite, params),
    email: params.get("email") || "nia.okafor@gmail.com",
    first: params.get("first") || "Nia",
    last: params.get("last") || "Okafor",
    password: params.get("pw") || "",
    show: !!params.get("pw"),
    resent: false,
  };
};

const CheckIcon = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#fffefb"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6 9 17l-5-5"></path>
  </svg>
);

/**
 * Set a password for a guest booking, route "/save-details": the form,
 * "Your details are saved" and "This link has expired".
 */
export const SaveDetailsPage = () => {
  const [state, setState] = useState(getInitialState);
  const saveTimer = useRef(0);
  const { view, email, show, resent } = state;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SaveDetailsForm>({
    defaultValues: { password: state.password },
    mode: "onTouched",
  });

  const password = watch("password");

  const set = (patch: Partial<SaveDetailsState>) =>
    setState((current) => ({ ...current, ...patch }));

  useLayoutEffect(() => {
    document.documentElement.classList.add("save-details-page");

    return () => document.documentElement.classList.remove("save-details-page");
  }, []);

  // re-check once zxcvbn has loaded
  usePasswordChecker();

  useEffect(() => {
    return () => window.clearTimeout(saveTimer.current);
  }, []);

  const getCheck = (value: string) =>
    checkPassword(value, {
      min: CLIENT_MIN,
      first: state.first,
      last: state.last,
      email,
    });

  const check = getCheck(password);

  const meter = getPasswordView(check, {
    show: !!errors.password,
    errorColour: "var(--accent-700)",
  });

  const passwordField = register("password", {
    validate: (value) => getCheck(value).valid,
  });

  const save = () =>
    new Promise<void>((resolve) => {
      saveTimer.current = window.setTimeout(() => {
        set({ view: "done" });
        resolve();
      }, SAVE_MS);
    });

  return (
    <div data-screen-label="Save details" className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.bar}>
          <Link to="/" className={styles.logoLink}>
            <img
              src={getAssetUrl("logos/logo-crimson-sm.png")}
              alt="Tiwára's House"
              className={styles.logo}
            />
          </Link>
        </div>
      </nav>
      <main className={styles.main}>
        {view === "form" && (
          <div data-sd-in="1" data-screen-label="Set password">
            <h1 className={styles.title}>Finish saving your details</h1>
            <p className={styles.lead}>
              Create a password to book faster and see all your bookings in one
              place.
            </p>
            <form
              className={styles.fields}
              noValidate
              onSubmit={handleSubmit(save)}
            >
              <div className={styles.field}>
                <span className={styles.label}>Email</span>
                <div aria-readonly="true" className={styles.readonly}>
                  {email}
                </div>
              </div>
              <div className={styles.field}>
                <label htmlFor="sd-pw" className={styles.label}>
                  Create a password
                </label>
                <span className={styles.inputWrap}>
                  <input
                    id="sd-pw"
                    type={show ? "text" : "password"}
                    autoComplete="new-password"
                    {...passwordField}
                    onBlur={(event) => {
                      if (event.target.value) void passwordField.onBlur(event);
                    }}
                    aria-describedby="sd-pw-help"
                    aria-invalid={meter.hasError ? "true" : "false"}
                    className={joinClassNames(
                      styles.input,
                      meter.hasError
                        ? styles.inputBorderError
                        : styles.inputBorder,
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => set({ show: !show })}
                    aria-label={show ? "Hide password" : "Show password"}
                    className={styles.toggle}
                  >
                    {show ? "Hide" : "Show"}
                  </button>
                </span>
                <PasswordMeter id="sd-pw-help" view={meter} />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={joinClassNames(
                  styles.save,
                  isSubmitting ? styles.saveBusy : styles.saveReady,
                )}
              >
                {isSubmitting ? "Saving…" : "Save my details"}
              </button>
            </form>
          </div>
        )}
        {view === "done" && (
          <div
            data-sd-in="1"
            data-screen-label="Details saved"
            className={styles.done}
          >
            <div className={styles.badge}>
              <CheckIcon size={30} />
            </div>
            <h1 className={styles.title}>Your details are saved</h1>
            <p className={styles.lead}>
              {`Log in with ${email} next time you book.`}
            </p>
            <div className={styles.doneActions}>
              <Link
                to="/account?section=personal"
                className={styles.primaryLink}
              >
                View my bookings
              </Link>
              <Link to="/" className={styles.secondaryLink}>
                Back to home
              </Link>
            </div>
          </div>
        )}
        {view === "expired" && (
          <div data-sd-in="1" data-screen-label="Link expired">
            <h1 className={styles.title}>This link has expired</h1>
            <p className={styles.lead}>
              {`Links to save your details work for 24 hours. We'll send a new one to ${email}.`}
            </p>
            {resent && (
              <div role="status" className={styles.sentNote}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent-700)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={styles.sentIcon}
                >
                  <path d="M20 6 9 17l-5-5"></path>
                </svg>
                <span>
                  {`Check your email. We've sent a new link to ${email}.`}
                </span>
              </div>
            )}
            <button
              onClick={() => set({ resent: true })}
              disabled={resent}
              className={joinClassNames(
                styles.sendNew,
                resent ? styles.sendDone : styles.sendReady,
              )}
            >
              Send a new link
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
