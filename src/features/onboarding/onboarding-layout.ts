// Discrete layout states for the shell and wizard (prototype renderVals: desk, mid, compact, noPhoto, clipped,
// heroH / heroScrim / authPad / contentMt …). Each becomes a data-* variant styled in the modules.
import type { PhotoKey } from "./onboarding-data";
import type { OnboardingState, ResolvedProps } from "./onboarding-state";

export interface OnboardingLayout {
  screen: string;
  isWizard: boolean;
  step: number;
  desk: boolean;
  mid: boolean;
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

export const getLayout = (
  state: OnboardingState,
  props: ResolvedProps,
): OnboardingLayout => {
  const screen = state.screen || "chooser";
  const desk =
    props.layout === "desktop"
      ? true
      : props.layout === "mobile"
        ? false
        : state.w
          ? state.w >= 900
          : true;
  const mid = state.w ? state.w >= 640 : true;
  const isWizard = /^w[1-5]$/.test(screen);
  const isDark = state.mode === "dark";
  const welcome = screen === "welcome";
  const compact = state.compact && !desk;
  const noPhoto = screen === "chooser" && !desk;
  const clipped = !noPhoto && (props.photo || "full") === "clipped" && !desk;
  const welcomeOver = clipped && welcome;
  const isPro =
    screen.startsWith("pro") ||
    (state.audience !== "customer" && !CUSTOMER_SCREENS.includes(screen));
  const heroVariant = noPhoto
    ? "nophoto"
    : clipped
      ? compact
        ? "clipped-compact"
        : welcome
          ? "clipped-welcome"
          : "clipped"
      : compact
        ? "compact"
        : welcome
          ? "welcome"
          : "default";
  const scrimVariant = noPhoto
    ? "none"
    : clipped
      ? welcome
        ? "clipped-welcome"
        : "clipped"
      : (isDark ? "dark" : "light") + (compact ? "-compact" : "");
  const authVariant = desk
    ? "desk"
    : noPhoto
      ? "nophoto"
      : welcomeOver
        ? "welcome-over"
        : welcome && !clipped
          ? compact
            ? "welcome-compact"
            : "welcome"
          : clipped
            ? "clipped"
            : compact
              ? "default-compact"
              : "default";
  const photoKey: PhotoKey =
    screen === "welcome" || screen === "chooser"
      ? "welcome"
      : isPro && !["pro-email", "pro-password", "pro-2fa"].includes(screen)
        ? "stylist"
        : "client";
  return {
    screen,
    isWizard,
    step: isWizard ? Number(screen[1]) : 0,
    desk,
    mid,
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
