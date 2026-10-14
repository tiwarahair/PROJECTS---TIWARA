import type { KeyboardEvent } from "react";
import { joinClassNames } from "../../utils/class-names";
import { CHOOSER_PATHS } from "./onboarding-data";
import { OnboardingTurnstile } from "./onboarding-turnstile";
import { PasswordInput, SubmitButton, TextField } from "./onboarding-fields";
import type { ScreenProps } from "./screen-props";
import styles from "../../styles/features/onboarding/auth-screens.module.css";

export const WelcomeScreen = ({ onboarding, layout }: ScreenProps) => {
  const { actions } = onboarding;

  const goWizard = () => {
    actions.setState({ audience: "pro" });
    actions.goTo("w1");
  };

  const goProLogin = () => {
    actions.setState({ audience: "pro" });
    actions.goTo("pro-email");
  };

  return (
    <>
      <h1
        className={joinClassNames(
          styles.welcomeTitle,
          layout.isDark ? styles.welcomeTitleDark : styles.welcomeTitleLight,
          layout.isDesktop
            ? styles.welcomeTitleDesk
            : styles.welcomeTitleMobile,
        )}
      >
        Run your hair
        <br />
        business, your way
      </h1>
      <p className={styles.welcomeLead}>
        Everything you need to take bookings and get paid.
      </p>
      <div className={styles.welcomeGap}></div>
      <button onClick={goWizard} className={styles.getStarted}>
        Get started
      </button>
      <div className={styles.welcomeLogin}>
        Already have an account?{" "}
        <button onClick={goProLogin} className={styles.textLink}>
          Log in
        </button>
      </div>
    </>
  );
};

export const ChooserScreen = ({ onboarding }: ScreenProps) => {
  const { actions } = onboarding;

  const cards = [
    {
      key: "c",
      iconPath: CHOOSER_PATHS.customer,
      title: "For customers",
      subtitle: "Book afro-hair stylists near you",
      audience: "customer" as const,
      screen: "cust-email",
    },
    {
      key: "p",
      iconPath: CHOOSER_PATHS.pro,
      title: "For professionals",
      subtitle: "Manage and grow your business",
      audience: "pro" as const,
      screen: "pro-email",
    },
  ];

  return (
    <>
      <h1 className={styles.chooserTitle}>Log in or sign up</h1>
      <div className={styles.chooserCards}>
        {cards.map(({ key, iconPath, title, subtitle, audience, screen }) => (
          <button
            key={key}
            onClick={() => {
              actions.setState({ audience });
              actions.goTo(screen);
            }}
            className={styles.chooserCard}
          >
            <span className={styles.chooserIcon}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={iconPath}></path>
              </svg>
            </span>
            <span className={styles.chooserText}>
              <span className={styles.chooserCardTitle}>{title}</span>
              <span className={styles.chooserCardSub}>{subtitle}</span>
            </span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={styles.subIcon}
            >
              <path d="M5 12h14M13 6l6 6-6 6"></path>
            </svg>
          </button>
        ))}
      </div>
    </>
  );
};

/** Google + Apple buttons under an "or" rule. */
const SocialButtons = ({ onboarding, layout }: ScreenProps) => {
  const { state, actions } = onboarding;
  const isPro = layout.screen === "pro-email";

  return (
    <>
      <div className={styles.orRule}>
        <span className={styles.orLine}></span>or
        <span className={styles.orLine}></span>
      </div>
      <div className={styles.socialButtons}>
        <button
          onClick={() => actions.socialSignIn(isPro)}
          disabled={state.busy}
          className={styles.socialButton}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 48 48"
            aria-hidden="true"
            className={styles.googleIcon}
          >
            <path
              fill="#FFC107"
              d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
            ></path>
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
            ></path>
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
            ></path>
            <path
              fill="#1976D2"
              d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
            ></path>
          </svg>
          Continue with Google
        </button>
        {/* Apple sign-in isn't set up yet: design boards only */}
        {import.meta.env.DEV && (
          <button disabled className={styles.socialButton}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 814 1000"
              fill="currentColor"
              aria-hidden="true"
              className={styles.appleIcon}
            >
              <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"></path>
            </svg>
            Continue with Apple
          </button>
        )}
      </div>
    </>
  );
};

/** Customer / pro log-in email, and forgot-password email. */
export const EmailScreen = (props: ScreenProps) => {
  const { onboarding, layout, view } = props;
  const { state, actions } = onboarding;
  const { screen, isDark } = layout;
  const isPro = screen === "pro-email";
  const isForgot = screen === "forgot-email";

  const enterSubmit = (event: KeyboardEvent) => {
    if (event.key === "Enter") actions.submit();
  };

  const switchTo = (audience: "customer" | "pro", target: string) => {
    actions.setState({ audience });
    actions.goTo(target);
  };

  const customerFooter =
    screen === "cust-email"
      ? [
          {
            key: "a",
            text: "Are you a stylist?",
            linkLabel: "Log in as a professional",
            onSelect: () => switchTo("pro", "pro-email"),
          },
        ]
      : [];

  const footer = isPro
    ? [
        {
          key: "a",
          text: "Booking an appointment?",
          linkLabel: "Log in as a customer",
          onSelect: () => switchTo("customer", "cust-email"),
        },
        {
          key: "b",
          text: "New to Tiwára’s House?",
          linkLabel: "List your business",
          onSelect: () => switchTo("pro", "welcome"),
        },
      ]
    : customerFooter;

  const customerTitle = isForgot
    ? "Reset your password"
    : "Tiwára’s House for customers";

  const customerLead = isForgot
    ? "Enter your email and we’ll send you a reset link."
    : "Log in or create an account to book.";

  return (
    <>
      <h1
        className={joinClassNames(
          styles.emailTitle,
          isPro ? styles.emailTitlePro : styles.emailTitleCustomer,
        )}
      >
        {isPro ? "Tiwára’s House for professionals" : customerTitle}
      </h1>
      <p className={styles.lead}>
        {isPro ? "Log in to manage your bookings." : customerLead}
      </p>
      <TextField
        id="ob-email"
        label="Email address"
        type="email"
        inputMode="email"
        autoComplete="email"
        {...actions.field("email")}
        onKeyDown={enterSubmit}
        error={view.shown.email ?? ""}
        invalid={!!view.shown.email}
        describedBy="ob-email-err"
        errorId="ob-email-err"
        errorLive
        animated
      />
      {!!state.serverErrors.noBusiness && (
        <div role="alert" className={styles.noBusiness}>
          <div className={styles.noBusinessTitle}>
            There’s no business account for this email
          </div>
          <div className={styles.noBusinessText}>
            Check the spelling, or set up your business in a few minutes.
          </div>
          <button
            onClick={() => switchTo("pro", "welcome")}
            className={styles.listBusiness}
          >
            List your business
          </button>
        </div>
      )}
      {view.turnstileShown && (
        <OnboardingTurnstile
          isDark={isDark}
          widgetRef={onboarding.turnstileRef}
          onToken={actions.setCaptchaToken}
        />
      )}
      <SubmitButton
        label={isForgot ? "Send reset link" : "Continue"}
        onClick={actions.submit}
        canSubmit={view.canSubmit}
        busy={state.busy}
        failure={state.failure}
        onRetry={actions.retry}
        variant="tight"
      />
      {!isForgot && <SocialButtons {...props} />}
      <div className={styles.emailFooter}>
        {footer.map(({ key, text, linkLabel, onSelect }) => (
          <div key={key}>
            {text}{" "}
            <button onClick={onSelect} className={styles.textLink}>
              {linkLabel}
            </button>
          </div>
        ))}
      </div>
    </>
  );
};

export const PasswordScreen = ({ onboarding, layout, view }: ScreenProps) => {
  const { state, actions } = onboarding;
  const shownError = view.shown.password ?? "";

  return (
    <>
      <h1 className={styles.passwordTitle}>Welcome back</h1>
      <div className={styles.emailChip}>
        <span className={styles.emailChipText}>{state.form.email}</span>
        <button
          onClick={() =>
            actions.goTo(layout.isPro ? "pro-email" : "cust-email", "back")
          }
          className={styles.change}
        >
          Change
        </button>
      </div>
      <label htmlFor="ob-pw" className={styles.label}>
        Password
      </label>
      <PasswordInput
        id="ob-pw"
        shown={state.passwordShown}
        onToggle={() =>
          actions.setState({ passwordShown: !state.passwordShown })
        }
        {...actions.field("password")}
        onKeyDown={(event) => {
          if (event.key === "Enter") actions.submit();
        }}
        autoComplete="current-password"
        invalid={!!shownError}
        describedBy="ob-pw-err"
        shake={!!state.shake}
        animated
      />
      <div
        id="ob-pw-err"
        role="alert"
        aria-live="polite"
        className={styles.fieldError}
      >
        {shownError}
      </div>
      <button
        onClick={() => actions.goTo("forgot-email")}
        className={styles.forgot}
      >
        Forgot password?
      </button>
      {view.turnstileShown && (
        <OnboardingTurnstile
          isDark={layout.isDark}
          widgetRef={onboarding.turnstileRef}
          onToken={actions.setCaptchaToken}
        />
      )}
      <SubmitButton
        label="Log in"
        onClick={actions.submit}
        canSubmit={view.canSubmit}
        busy={state.busy}
        failure={state.failure}
        onRetry={actions.retry}
        variant="loose"
      />
    </>
  );
};
