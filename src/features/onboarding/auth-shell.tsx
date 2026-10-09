import type { CSSProperties, FocusEvent, ReactNode } from "react";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { BENEFITS, FOOTER_SCREENS, PHOTOS } from "./onboarding-data";
import type { OnboardingLayout } from "./onboarding-layout";
import { BackIcon, ModeIcon } from "./ob-fields";
import styles from "./auth-shell.module.css";
import type { OnboardingController } from "./use-onboarding";

interface AuthShellProps {
  onboarding: OnboardingController;
  layout: OnboardingLayout;
  children: ReactNode;
}

const PHOTO_CLASS = {
  welcome: styles.photoWelcome,
  client: styles.photoClient,
  stylist: styles.photoStylist,
};

/** The heroPhotos background (photo URL as a custom property; position by photo). */
const HeroPhoto = ({
  photoKey,
  className,
}: {
  photoKey: OnboardingLayout["photoKey"];
  className: string | undefined;
}) => {
  const [src] = PHOTOS[photoKey];
  // ph.url
  const photoStyle = {
    "--ob-photo": "url('" + getAssetUrl(src) + "')",
  } as CSSProperties;
  return (
    <div
      key={photoKey}
      className={joinClassNames(className, PHOTO_CLASS[photoKey])}
      style={photoStyle}
    ></div>
  );
};

/** Auth + welcome layout: photo hero (mobile) or header + photo panel (desktop), the screen column and footer. */
export const AuthShell = ({ onboarding, layout, children }: AuthShellProps) => {
  const { state, actions } = onboarding;
  const { setState } = actions;
  const {
    screen,
    desk,
    isDark,
    noPhoto,
    welcomeOver,
    heroVariant,
    scrimVariant,
    authVariant,
    photoKey,
  } = layout;
  const canBack =
    screen !== "studio" && screen !== "forgot-done" && screen !== "pro-done";
  const modeLabel = isDark ? "Switch to light mode" : "Switch to dark mode";
  const toggleMode = () => actions.setMode(isDark ? "light" : "dark");
  const goProLogin = () => {
    setState({ audience: "pro" });
    actions.go("pro-email");
  };
  const goWizard = () => {
    setState({ audience: "pro" });
    actions.go("w1");
  };
  // mobile: shrink the hero while a text field has focus
  const compactOn = (event: FocusEvent) => {
    const target = event.target as HTMLElement;
    if (desk || target.tagName !== "INPUT") return;
    if ((target as HTMLInputElement).type === "checkbox") return;
    actions.cancelCompact();
    if (!state.compact) setState({ compact: true });
  };
  const compactOff = () => {
    actions.compactLater(() => {
      const active = document.activeElement;
      if (!active || active.tagName !== "INPUT") setState({ compact: false });
    });
  };
  const benefit = BENEFITS[state.bn] ?? BENEFITS[0];

  return (
    <div
      className={joinClassNames(
        styles.shell,
        desk ? styles.shellRow : styles.shellColumn,
      )}
    >
      <div className={styles.authSide}>
        {!desk && (
          <div data-variant={heroVariant} className={styles.hero}>
            {!noPhoto && (
              <HeroPhoto photoKey={photoKey} className={styles.heroPhoto} />
            )}
            <div data-variant={scrimVariant} className={styles.scrim}></div>
            {welcomeOver && (
              <div className={styles.welcomeOver}>
                <h1 className={styles.welcomeOverTitle}>
                  Run your hair business, your way
                </h1>
                <button onClick={goWizard} className={styles.getStarted}>
                  Get started
                </button>
                <div className={styles.welcomeOverLogin}>
                  Already have an account?{" "}
                  <button
                    onClick={goProLogin}
                    className={styles.welcomeOverLink}
                  >
                    Log in
                  </button>
                </div>
              </div>
            )}
            <div className={styles.heroBar}>
              {canBack && (
                <button
                  onClick={actions.back}
                  aria-label="Back"
                  className={joinClassNames(
                    styles.heroBack,
                    noPhoto ? styles.heroButtonPlain : styles.heroButtonPhoto,
                  )}
                >
                  <BackIcon />
                </button>
              )}
              <img
                src={getAssetUrl(
                  noPhoto && !isDark
                    ? "_ds_assets/logo-crimson-sm.png"
                    : "_ds_assets/logo-cream-sm.png",
                )}
                alt="Tiwára's House"
                className={styles.heroLogo}
              />
              <button
                onClick={toggleMode}
                aria-label={modeLabel}
                title={modeLabel}
                className={joinClassNames(
                  styles.heroMode,
                  noPhoto ? styles.heroButtonPlain : styles.heroButtonPhoto,
                )}
              >
                <ModeIcon isDark={isDark} />
              </button>
            </div>
          </div>
        )}
        {desk && (
          <div className={styles.deskBar}>
            {canBack && (
              <button
                onClick={actions.back}
                aria-label="Back"
                className={styles.deskBack}
              >
                <BackIcon />
              </button>
            )}
            <button
              onClick={toggleMode}
              aria-label={modeLabel}
              title={modeLabel}
              className={styles.deskMode}
            >
              <ModeIcon isDark={isDark} />
            </button>
          </div>
        )}
        {/* focus/blur bubble from the screen's inputs (prototype onFocus / onBlur on this column) */}
        <div
          onFocus={compactOn}
          onBlur={compactOff}
          data-variant={authVariant}
          className={styles.auth}
        >
          <div
            key={screen}
            className={joinClassNames(
              styles.screen,
              desk ? styles.screenDesk : styles.screenMobile,
              state.dir === "back" ? styles.enterBack : styles.enterForward,
            )}
          >
            {state.netErr && (
              <div role="alert" className={styles.netError}>
                <span className={styles.grow}>
                  We couldn’t connect. Check your signal and try again.
                </span>
                <button
                  onClick={() => {
                    setState({ netErr: false });
                    actions.submit();
                  }}
                  className={styles.retry}
                >
                  Try again
                </button>
              </div>
            )}
            {children}
          </div>
        </div>
        {FOOTER_SCREENS.includes(screen) && (
          <div
            className={joinClassNames(
              styles.footer,
              desk ? styles.footerDesk : styles.footerMobile,
            )}
          >
            {/* prototype placeholder links */}
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a href="#" className={styles.footerLink}>
              Support
            </a>
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                setState({ termsOn: "privacy" });
              }}
              className={styles.footerLink}
            >
              Privacy
            </a>
          </div>
        )}
      </div>
      {desk && (
        <div className={styles.photoSide}>
          <div className={styles.photoFrame}>
            <HeroPhoto photoKey={photoKey} className={styles.photo} />
            {screen === "welcome" && benefit && (
              <>
                <div className={styles.photoFade}></div>
                <div
                  onMouseEnter={() => actions.holdCarousel(true)}
                  onMouseLeave={() => actions.holdCarousel(false)}
                  role="region"
                  aria-roledescription="carousel"
                  aria-label="Why stylists use Tiwára's House"
                  className={styles.carousel}
                >
                  <div className={styles.benefitCard}>
                    <div
                      key={state.bn}
                      aria-live="polite"
                      className={styles.benefit}
                    >
                      <span className={styles.benefitIcon}>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={styles.benefitSvg}
                        >
                          <path d={benefit.d}></path>
                        </svg>
                      </span>
                      <span className={styles.benefitText}>
                        <span className={styles.benefitTitle}>
                          {benefit.title}
                        </span>
                        <span className={styles.benefitSub}>{benefit.sub}</span>
                      </span>
                    </div>
                  </div>
                  <div className={styles.dots}>
                    {BENEFITS.map(({ title }, index) => (
                      <button
                        key={title}
                        onClick={() => actions.showBenefit(index)}
                        aria-label={"Show benefit " + (index + 1) + " of 4"}
                        aria-current={state.bn === index ? "true" : "false"}
                        className={joinClassNames(
                          styles.dot,
                          state.bn === index ? styles.dotOn : styles.dotOff,
                        )}
                      ></button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
