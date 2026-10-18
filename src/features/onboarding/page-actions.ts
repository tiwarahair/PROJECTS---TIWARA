import { getBackScreen } from "./state";
import type { OnboardingBase } from "./use-base";

interface SubmitActions {
  submit: () => void;
  resend: () => void;
  sendAgain: (captchaToken: string) => void;
}

export const getPageActions = (
  {
    stateRef,
    navigate,
    timers,
    carouselHeld,
    carouselTouchedAt,
    setState,
    later,
    goTo,
  }: OnboardingBase,
  { submit, resend, sendAgain }: SubmitActions,
) => ({
  back: () => {
    const target = getBackScreen(stateRef.current);
    const { screen, entryScreen, exitTo } = stateRef.current;

    if (exitTo && screen === entryScreen) return navigate(exitTo);

    if (target) goTo(target, "back");
    else if (screen === "chooser" || screen === "welcome") navigate("/");
    else goTo("chooser", "back");
  },
  retry: () => {
    const { isResendFailure } = stateRef.current;

    setState({ failure: null });

    if (isResendFailure) resend();
    else submit();
  },
  setCaptchaToken: (captchaToken: string | null) => {
    const { resendArmed, submitArmed } = stateRef.current;

    if (captchaToken && resendArmed) sendAgain(captchaToken);
    else if (resendArmed)
      setState({
        resendArmed: false,
        failure: "botCheck",
        isResendFailure: true,
      });
    else if (!submitArmed) setState({ captchaToken });
    else if (captchaToken)
      setState({ captchaToken, busy: false, submitArmed: false }, submit);
    else setState({ busy: false, submitArmed: false, failure: "botCheck" });
  },
  autoNext: (to: string, after?: () => void) =>
    later(
      "auto",
      () => {
        after?.();
        goTo(to);
      },
      300,
    ),
  holdCarousel: (held: boolean) => {
    carouselHeld.current = held;
  },
  showBenefit: (index: number) => {
    carouselTouchedAt.current = Date.now();
    setState({ benefitIndex: index });
  },
  compactLater: (callback: () => void) => later("compact", callback, 140),
  cancelCompact: () => window.clearTimeout(timers.current.compact),
});
