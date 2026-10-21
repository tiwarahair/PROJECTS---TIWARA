import type { KeyboardEvent } from "react";
import { joinClassNames } from "../../utils/class-names";
import { ArrowRight } from "lucide-react";
import { GoogleLogo } from "../../components/icons/brand-icons";
import { CHOOSER_ICONS } from "./data";
import { OnboardingTurnstile } from "./turnstile";
import { PasswordInput, SubmitButton, TextField } from "./fields";
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
      icon: CHOOSER_ICONS.customer,
      title: "For customers",
      subtitle: "Book afro-hair stylists near you",
      audience: "customer" as const,
      screen: "cust-email",
    },
    {
      key: "p",
      icon: CHOOSER_ICONS.pro,
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
        {cards.map(
          ({ key, icon: CardIcon, title, subtitle, audience, screen }) => (
            <button
              key={key}
              onClick={() => {
                actions.setState({ audience });
                actions.goTo(screen);
              }}
              className={styles.chooserCard}
            >
              <span className={styles.chooserIcon}>
                <CardIcon size={20} strokeWidth={1.7} />
              </span>
              <span className={styles.chooserText}>
                <span className={styles.chooserCardTitle}>{title}</span>
                <span className={styles.chooserCardSub}>{subtitle}</span>
              </span>
              <ArrowRight
                size={20}
                strokeWidth={1.7}
                className={styles.subIcon}
              />
            </button>
          ),
        )}
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
          <GoogleLogo size={18} className={styles.googleIcon} />
          Continue with Google
        </button>
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
