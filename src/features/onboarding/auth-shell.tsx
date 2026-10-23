import type { CSSProperties, FocusEvent, ReactNode } from "react";
import { getAssetImageSet, getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { BENEFITS, FOOTER_SCREENS, PHOTOS } from "./data";
import type { OnboardingLayout } from "./layout";
import { ChevronLeft } from "lucide-react";
import { ModeIcon } from "./fields";
import styles from "../../styles/features/onboarding/auth-shell.module.css";
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

/** The hero photo background (photo URL as a custom property; position by photo). */
const HeroPhoto = ({
  photoKey,
  className,
}: {
  photoKey: OnboardingLayout["photoKey"];
  className: string | undefined;
}) => {
  const [src] = PHOTOS[photoKey];

  const imageSet = getAssetImageSet(src, 1080);
  const plainPhoto = `url('${getAssetUrl(src)}')`;

  const photoStyle = {
    "--ob-photo": imageSet?.jpeg ?? plainPhoto,
    "--ob-photo-set": imageSet?.imageSet ?? plainPhoto,
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
    isDesktop,
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
    actions.goTo("pro-email");
  };

  const goWizard = () => {
    setState({ audience: "pro" });
    actions.goTo("w1");
  };

  // mobile: shrink the hero while a text field has focus
  const compactOn = (event: FocusEvent) => {
    const target = event.target as HTMLElement;

    if (isDesktop || target.tagName !== "INPUT") return;

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

  const benefit = BENEFITS[state.benefitIndex] ?? BENEFITS[0];

  return (
    <div
      className={joinClassNames(
        styles.shell,
        isDesktop ? styles.shellRow : styles.shellColumn,
      )}
    >
      <div className={styles.authSide}>
        {!isDesktop && (
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
                  <ChevronLeft size={20} strokeWidth={2} />
                </button>
              )}
              <img
                src={getAssetUrl(
                  noPhoto && !isDark
                    ? "logos/logo-crimson-sm.png"
                    : "logos/logo-cream-sm.png",
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
        {isDesktop && (
          <div className={styles.deskBar}>
            {canBack && (
              <button
                onClick={actions.back}
                aria-label="Back"
                className={styles.deskBack}
              >
                <ChevronLeft size={20} strokeWidth={2} />
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
        {/* focus/blur bubble up from the screen's inputs to this column */}
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
              isDesktop ? styles.screenDesk : styles.screenMobile,
              state.direction === "back"
                ? styles.enterBack
                : styles.enterForward,
            )}
          >
            {children}
          </div>
        </div>
        {FOOTER_SCREENS.includes(screen) && (
          <div
            className={joinClassNames(
              styles.footer,
              isDesktop ? styles.footerDesk : styles.footerMobile,
            )}
          >
            {/* placeholder links */}
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
      {isDesktop && (
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
                      key={state.benefitIndex}
                      aria-live="polite"
                      className={styles.benefit}
                    >
                      <span className={styles.benefitIcon}>
                        <benefit.icon
                          size={20}
                          strokeWidth={2}
                          className={styles.benefitSvg}
                        />
                      </span>
                      <span className={styles.benefitText}>
                        <span className={styles.benefitTitle}>
                          {benefit.title}
                        </span>
                        <span className={styles.benefitSub}>
                          {benefit.subtitle}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className={styles.dots}>
                    {BENEFITS.map(({ title }, index) => (
                      <button
                        key={title}
                        onClick={() => actions.showBenefit(index)}
                        aria-label={`Show benefit ${index + 1} of 4`}
                        aria-current={
                          state.benefitIndex === index ? "true" : "false"
                        }
                        className={joinClassNames(
                          styles.dot,
                          state.benefitIndex === index
                            ? styles.dotOn
                            : styles.dotOff,
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
