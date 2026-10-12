import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { usePasswordChecker } from "../../hooks/use-password-checker";
import { PasswordMeter } from "../../components/password-meter/password-meter";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { getSearchParams } from "../../utils/page-flags";
import { checkPassword, getPasswordView } from "../../utils/password";
import "./save-details-helmet.module.css";
import styles from "./save-details-page.module.css";

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
  shown: boolean;
  saving: boolean;
  resent: boolean;
}

const getInitialView = (
  invite: string,
  params: URLSearchParams,
): SaveDetailsState["view"] => {
  if (invite === "expired") return "expired";

  return params.get("state") === "done" ? "done" : "form";
};

/** ?invite=demo|expired, ?state=done, ?email / first / last / pw seed the page (prototype constructor). */
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
    shown: false,
    saving: false,
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
 * Set a password for a guest booking, route "/save-details" (prototype Save Details.dc.html): the form,
 * "Your details are saved" and "This link has expired".
 */
export const SaveDetailsPage = () => {
  const [state, setState] = useState(getInitialState);
  const saveTimer = useRef(0);
  const { view, email, password, show, shown, saving, resent } = state;

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

  const check = checkPassword(password, {
    min: CLIENT_MIN,
    first: state.first,
    last: state.last,
    email,
  });

  const meter = getPasswordView(check, {
    show: shown,
    errorColour: "var(--accent-700)",
  });

  const save = () => {
    if (saving) return;

    if (!check.valid) return set({ shown: true });

    set({ saving: true, shown: false });

    saveTimer.current = window.setTimeout(
      () => set({ saving: false, view: "done" }),
      SAVE_MS,
    );
  };

  return (
    <div data-screen-label="Save details" className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.bar}>
          <Link to="/" className={styles.logoLink}>
            <img
              src={getAssetUrl("_ds_assets/logo-crimson.png")}
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
            <div className={styles.fields}>
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
                    value={password}
                    onChange={(event) => set({ password: event.target.value })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") save();
                    }}
                    onBlur={() => {
                      if (password) set({ shown: true });
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
                onClick={save}
                disabled={saving}
                className={joinClassNames(
                  styles.save,
                  saving ? styles.saveBusy : styles.saveReady,
                )}
              >
                {saving ? "Saving…" : "Save my details"}
              </button>
            </div>
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
