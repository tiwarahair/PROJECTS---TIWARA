import { useEffect } from "react";
import { getAssetImageSet, getAssetUrl } from "../../utils/asset-url";
import { MODE_KEY, PHOTOS } from "./onboarding-data";
import { readStorage } from "./onboarding-start";
import { isCodeScreen } from "./onboarding-state";
import type { OnboardingBase } from "./use-base";

export const useOnboardingTimers = (
  {
    resolved,
    state,
    stateRef,
    rootRef,
    codeRefs,
    timers,
    carouselHeld,
    carouselTouchedAt,
    setState,
  }: OnboardingBase,
  setMode: (mode: "light" | "dark") => void,
) => {
  // width drives desktop (≥900) / tablet (≥640) layouts
  useEffect(() => {
    const root = rootRef.current;

    if (!root || !window.ResizeObserver) return;

    const observer = new ResizeObserver((entries) => {
      const width = Math.round(entries[0]?.contentRect.width ?? 0);

      if (Math.abs(width - stateRef.current.width) > 4) setState({ width });
    });

    observer.observe(root);

    return () => observer.disconnect();
  }, [setState, rootRef, stateRef]);

  // follow the system theme unless the user (or ?theme=) chose one
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-color-scheme: dark)");

    if (!query?.addEventListener) return;

    const handleChange = (event: MediaQueryListEvent) => {
      if (
        !readStorage(localStorage, MODE_KEY) &&
        (!resolved.theme || resolved.theme === "auto")
      )
        setMode(event.matches ? "dark" : "light");
    };

    query.addEventListener("change", handleChange);

    return () => query.removeEventListener("change", handleChange);
  }, [resolved.theme, setMode]);

  // preload the three photos; rotate the welcome benefits every 5s; count down resend
  useEffect(() => {
    const preload = window.setTimeout(() => {
      for (const [src] of Object.values(PHOTOS))
        new Image().src =
          getAssetImageSet(src, 1080)?.avifUrl ?? getAssetUrl(src);
    }, 1200);

    const carousel = window.setInterval(() => {
      const { screen } = stateRef.current;

      if (screen !== "welcome" || carouselHeld.current || document.hidden)
        return;

      if (
        carouselTouchedAt.current &&
        Date.now() - carouselTouchedAt.current < 5000
      )
        return;

      setState((current) => ({ benefitIndex: (current.benefitIndex + 1) % 4 }));
    }, 5000);

    const tick = window.setInterval(() => {
      const { resendIn, screen } = stateRef.current;

      if (resendIn > 0 && (isCodeScreen(screen) || screen === "forgot-sent"))
        setState((current) => ({ resendIn: current.resendIn - 1 }));
    }, 1000);

    const pending = timers.current;

    return () => {
      window.clearTimeout(preload);
      window.clearInterval(carousel);
      window.clearInterval(tick);
      Object.values(pending).forEach((timer) => window.clearTimeout(timer));
    };
  }, [setState, stateRef, carouselHeld, carouselTouchedAt, timers]);

  // code screens focus the first box once the slide-in has run
  useEffect(() => {
    if (!isCodeScreen(state.screen)) return;

    const timer = window.setTimeout(
      () => codeRefs[0]?.current?.focus({ preventScroll: true }),
      360,
    );

    return () => window.clearTimeout(timer);
  }, [state.screen, codeRefs]);
};
