import { zodResolver } from "@hookform/resolvers/zod";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useIsSlow } from "../../hooks/use-is-slow";
import { getAccountKind, signIn } from "../../lib/auth";
import { AUTH_FAILURE_MESSAGES, getAuthFailure } from "../../lib/auth-errors";
import { joinClassNames } from "../../utils/class-names";
import { Spinner } from "../onboarding/onboarding-fields";
import { OnboardingTurnstile } from "../onboarding/onboarding-turnstile";
import { CloseIcon } from "./booking-dialogs";
import { loginEmailSchema, loginPasswordSchema } from "./booking-schemas";
import type { LoginValues } from "./booking-schemas";
import { GoogleIcon } from "./brand-icons";
import { ErrorIcon } from "./details-field";
import fields from "../../styles/features/booking/booking-fields.module.css";
import pageGlobal from "../../styles/features/booking/booking-page-global.module.css";
import dialogs from "../../styles/features/booking/booking-dialogs.module.css";
import styles from "../../styles/features/booking/booking-login-dialog.module.css";
import type { BookingController } from "./use-booking";

interface LoginDialogProps {
  booking: BookingController;
}

type LoginStep = "choice" | "email" | "password" | "none";

const TITLES: Record<LoginStep, string> = {
  choice: "Have an account?",
  email: "Log in",
  password: "Welcome back",
  none: "No account found",
};

export const LoginDialog = ({ booking }: LoginDialogProps) => {
  const { state, actions } = booking;
  const [step, setStep] = useState<LoginStep>(state.loginStart ?? "email");
  const [busy, setBusy] = useState(false);
  const [isLoggedIn, setLoggedIn] = useState(false);
  const isWaiting = busy || isLoggedIn;
  const isSlow = useIsSlow(isWaiting);
  const [failure, setFailure] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const stepRef = useRef(step);

  stepRef.current = step;

  const {
    register,
    handleSubmit,
    setFocus,
    setError,
    getValues,
    formState: { errors },
  } = useForm<LoginValues>({
    defaultValues: { email: "", password: "" },
    resolver: (values, context, options) =>
      zodResolver(
        stepRef.current === "password" ? loginPasswordSchema : loginEmailSchema,
      )(values, context, options),
  });

  const email = getValues("email").trim().toLowerCase();
  const submitLabel = step === "email" ? "Continue" : "Log in";
  const isFormStep = step === "email" || step === "password";

  useEffect(() => {
    if (isFormStep) setFocus(step);
  }, [isFormStep, step, setFocus]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") actions.closeLogin();
    };

    document.addEventListener("keydown", closeOnEscape);

    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [actions]);

  const takeToken = () => {
    const current = token ?? "";

    setToken(null);
    turnstileRef.current?.reset();

    return current;
  };

  const run = (task: () => Promise<void>) => {
    setBusy(true);
    setFailure("");

    task()
      .catch((error: unknown) =>
        setFailure(AUTH_FAILURE_MESSAGES[getAuthFailure(error)]),
      )
      .finally(() => setBusy(false));
  };

  const submit = handleSubmit(({ email: typedEmail, password }) =>
    run(async () => {
      const email = typedEmail.trim().toLowerCase();

      if (step === "email") {
        const kind = await getAccountKind(email, takeToken());

        setStep(kind === "none" ? "none" : "password");

        return;
      }

      const error = await signIn(email, password, takeToken());

      if (error === "invalid_credentials")
        setError("password", { message: "That password isn’t right" });

      if (error === "email_not_confirmed")
        setFailure(
          "Confirm your email first. Log in on the full page to get a new code.",
        );

      if (!error) setLoggedIn(true);
    }),
  );

  const renderField = (name: keyof LoginValues, label: string) => {
    const error = errors[name]?.message;
    const id = `bk-login-${name}`;

    return (
      <div key={name} className={fields.fieldWide}>
        <label htmlFor={id} className={fields.label}>
          {label}
        </label>
        <input
          id={id}
          type={name}
          autoComplete={name === "email" ? "email" : "current-password"}
          {...register(name)}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={`${id}-err`}
          className={joinClassNames(
            fields.input,
            error ? fields.borderError : fields.border,
          )}
        />
        {!!error && (
          <div id={`${id}-err`} role="alert" className={fields.error}>
            <ErrorIcon />
            {error}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      data-screen-label="Log in"
      className={joinClassNames(
        pageGlobal.bkscrim,
        pageGlobal.bkmscrim,
        dialogs.confirmScrim,
      )}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bk-login-t"
        className={joinClassNames(
          pageGlobal.bkpanel,
          pageGlobal.bkmpanel,
          dialogs.confirmPanel,
        )}
      >
        <div className={dialogs.confirmHead}>
          <h3 id="bk-login-t" className={dialogs.confirmTitle}>
            {TITLES[step]}
          </h3>
          <button
            type="button"
            onClick={actions.closeLogin}
            aria-label="Close"
            className={dialogs.confirmClose}
          >
            <CloseIcon />
          </button>
        </div>
        {step === "choice" && (
          <>
            <p className={dialogs.confirmText}>
              Log in to book with your saved details, or carry on as a guest.
            </p>
            <div className={styles.stack}>
              <button
                type="button"
                onClick={() => setStep("email")}
                className={dialogs.primary}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => actions.continueAsGuestWith("")}
                className={dialogs.secondary}
              >
                Continue as guest
              </button>
              <p className={styles.note}>
                You can save your details after booking.
              </p>
            </div>
          </>
        )}
        {step === "email" && (
          <p className={dialogs.confirmText}>
            We’ll fill in your name, email and mobile from your account.
          </p>
        )}
        {step === "password" && (
          <p className={dialogs.confirmText}>
            {email}{" "}
            <button
              type="button"
              onClick={() => setStep("email")}
              className={fields.linkButton}
            >
              Change
            </button>
          </p>
        )}
        {step === "none" && (
          <>
            <p className={dialogs.confirmText}>
              {`There’s no account for ${email}. You can book as a guest and save your details afterwards.`}
            </p>
            <div className={styles.stack}>
              <button
                type="button"
                onClick={() => actions.continueAsGuestWith(email)}
                className={dialogs.primary}
              >
                Continue as guest
              </button>
              <button
                type="button"
                onClick={() => actions.leaveForLogin("cust-create")}
                className={dialogs.secondary}
              >
                Create an account
              </button>
              <button
                type="button"
                onClick={() => setStep("email")}
                className={joinClassNames(fields.linkButton, styles.textLink)}
              >
                Use a different email
              </button>
            </div>
          </>
        )}
        {isFormStep && (
          <form noValidate onSubmit={submit} className={styles.form}>
            {step === "email"
              ? renderField("email", "Email")
              : renderField("password", "Password")}
            {step === "password" && (
              <button
                type="button"
                onClick={() => actions.leaveForLogin("forgot-email")}
                className={joinClassNames(fields.linkButton, styles.forgot)}
              >
                Forgot password?
              </button>
            )}
            {!!failure && (
              <p role="alert" className={styles.failure}>
                {failure}
              </p>
            )}
            <OnboardingTurnstile
              isDark={false}
              widgetRef={turnstileRef}
              onToken={setToken}
            />
            <button
              type="submit"
              disabled={isWaiting || !token}
              aria-label={isSlow ? submitLabel : undefined}
              aria-busy={isWaiting}
              className={joinClassNames(dialogs.primary, styles.submit)}
            >
              {isSlow ? <Spinner /> : submitLabel}
            </button>
            {step === "email" && (
              <>
                <div className={styles.divider}>
                  <span>or</span>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => actions.googleLogin())}
                  className={joinClassNames(dialogs.secondary, styles.google)}
                >
                  <GoogleIcon size={18} />
                  Continue with Google
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
