// Discrete layout states for the shell and wizard (the hero, scrim and auth variants). Each becomes a data-*
// variant styled in the modules.
import type { PhotoKey } from "./data";
import type { OnboardingState, ResolvedProps } from "./state";

export interface OnboardingLayout {
  screen: string;
  isWizard: boolean;
  step: number;
  isDesktop: boolean;
  isTabletOrWider: boolean;
  isDark: boolean;
  isPro: boolean;
  noPhoto: boolean;
  welcomeOver: boolean;
  heroVariant: string;
  scrimVariant: string;
  authVariant: string;
  photoKey: PhotoKey;
}

const CUSTOMER_SCREENS = [
  "chooser",
  "cust-email",
  "cust-password",
  "cust-create",
  "cust-social",
];

interface VariantFlags {
  isDesktop: boolean;
  noPhoto: boolean;
  clipped: boolean;
  compact: boolean;
  welcome: boolean;
  welcomeOver: boolean;
  isDark: boolean;
}

/** Forced by the layout prop, otherwise by width (desktop until the width is known). */
const getIsDesktop = ({ layout }: ResolvedProps, width: number) => {
  if (layout === "desktop") return true;

  if (layout === "mobile") return false;

  return width ? width >= 900 : true;
};

const getHeroVariant = ({
  noPhoto,
  clipped,
  compact,
  welcome,
}: VariantFlags) => {
  if (noPhoto) return "nophoto";

  if (clipped) {
    if (compact) return "clipped-compact";

    return welcome ? "clipped-welcome" : "clipped";
  }

  if (compact) return "compact";

  return welcome ? "welcome" : "default";
};

const getScrimVariant = ({
  noPhoto,
  clipped,
  welcome,
  isDark,
  compact,
}: VariantFlags) => {
  if (noPhoto) return "none";

  if (clipped) return welcome ? "clipped-welcome" : "clipped";

  return (isDark ? "dark" : "light") + (compact ? "-compact" : "");
};

const getAuthVariant = ({
  isDesktop,
  noPhoto,
  welcomeOver,
  welcome,
  clipped,
  compact,
}: VariantFlags) => {
  if (isDesktop) return "desk";

  if (noPhoto) return "nophoto";

  if (welcomeOver) return "welcome-over";

  if (welcome && !clipped) return compact ? "welcome-compact" : "welcome";

  if (clipped) return "clipped";

  return compact ? "default-compact" : "default";
};

const getPhotoKey = (screen: string, isPro: boolean): PhotoKey => {
  if (screen === "welcome" || screen === "chooser") return "welcome";

  return isPro && !["pro-email", "pro-password", "pro-2fa"].includes(screen)
    ? "stylist"
    : "client";
};

export const getLayout = (
  state: OnboardingState,
  props: ResolvedProps,
): OnboardingLayout => {
  const screen = state.screen || "chooser";
  const isDesktop = getIsDesktop(props, state.width);
  const isTabletOrWider = state.width ? state.width >= 640 : true;
  const isWizard = /^w[1-5]$/.test(screen);
  const isDark = state.mode === "dark";
  const welcome = screen === "welcome";
  const compact = state.compact && !isDesktop;
  const noPhoto = screen === "chooser" && !isDesktop;

  const clipped =
    !noPhoto && (props.photo || "full") === "clipped" && !isDesktop;

  const welcomeOver = clipped && welcome;

  const isPro =
    screen.startsWith("pro") ||
    (state.audience !== "customer" && !CUSTOMER_SCREENS.includes(screen));

  const flags: VariantFlags = {
    isDesktop,
    noPhoto,
    clipped,
    compact,
    welcome,
    welcomeOver,
    isDark,
  };

  const heroVariant = getHeroVariant(flags);
  const scrimVariant = getScrimVariant(flags);
  const authVariant = getAuthVariant(flags);
  const photoKey = getPhotoKey(screen, isPro);

  return {
    screen,
    isWizard,
    step: isWizard ? Number(screen[1]) : 0,
    isDesktop,
    isTabletOrWider,
    isDark,
    isPro,
    noPhoto,
    welcomeOver,
    heroVariant,
    scrimVariant,
    authVariant,
    photoKey,
  };
};
