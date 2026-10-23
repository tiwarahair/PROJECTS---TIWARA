import { becomeStylist } from "../../lib/account-changes";
import { signUpStylist } from "../../lib/auth";
import { getAuthFailure } from "../../lib/auth-errors";
import { needsSecondFactor } from "../../lib/two-factor";
import { getStylistDetails, getWelcomeMessage } from "./submit-logic";
import type { FinishKind } from "./submit-logic";
import type { OnboardingCore } from "./use-onboarding";

const LOCK_MS = 9e5;
const MAX_ATTEMPTS = 5;

export interface SubmitCore extends OnboardingCore {
  /** Places the address (or mobile postcode); false when Google can't. */
  geocode: () => Promise<boolean>;
}

export const getSubmitActions = ({
  stateRef,
  isUpgrade,
  setState,
  goTo,
  later,
  clearSaved,
  navigate,
  turnstileRef,
  formApi: { getValues },
}: SubmitCore) => {
  /** Uses up the current Turnstile token and asks the widget for a fresh one. */
  const takeCaptchaToken = () => {
    const token = stateRef.current.captchaToken ?? "";

    setState({ captchaToken: null });
    turnstileRef.current?.reset();

    return token;
  };

  /** Runs a server call with the busy state; unexpected failures show what went wrong above the button. */
  const run = (task: () => Promise<void>) => {
    setState({ busy: true });

    task().then(
      () => setState({ failure: null }),
      (error: unknown) =>
        setState({
          busy: false,
          failure: getAuthFailure(error),
          isResendFailure: false,
        }),
    );
  };

  const toStudio = (isNew: boolean) => {
    goTo("studio");

    later(
      "studio",
      () => navigate(`/studio${isNew ? "?welcome=1" : ""}`, { replace: true }),
      500,
    );
  };

  const finish = (kind: FinishKind) => {
    if (kind === "newpro") {
      clearSaved();
      setState({ busy: false });
      goTo("pro-done");

      return;
    }

    if (kind === "pro") return toStudio(false);

    const message = getWelcomeMessage(kind, getValues("first").trim());

    try {
      sessionStorage.setItem("tw_toast", message);
      sessionStorage.removeItem("tw_return");
    } catch {
      // storage unavailable
    }

    setState({ busy: true });
    navigate(stateRef.current.returnTo || "/", { replace: true });
  };

  const afterProAuth = async () => {
    if (await needsSecondFactor())
      setState({ codeKind: "2fa" }, () => goTo("pro-2fa"));
    else finish("pro");
  };

  const showWrongPassword = () => {
    const attempts = stateRef.current.attempts + 1;

    if (attempts >= MAX_ATTEMPTS)
      setState({
        busy: false,
        attempts,
        lockedUntil: Date.now() + LOCK_MS,
        serverErrors: {
          password: "Too many attempts. Try again in 15 minutes.",
        },
      });
    else
      setState((state) => ({
        busy: false,
        attempts,
        shake: state.shake + 1,
        serverErrors: {
          password: "That password isn’t right. Try again or reset it.",
        },
      }));
  };

  const showWrongCode = () =>
    setState((state) => ({
      busy: false,
      shake: state.shake + 1,
      codeError: "That code isn’t right",
    }));

  /** w5's Continue and Skip both create the stylist (Skip without a referral source). */
  const createStylist = (skipSource = false) =>
    run(async () => {
      const form = getValues();

      const details = getStylistDetails(
        skipSource ? { ...form, referralSource: "" } : form,
        stateRef.current,
      );

      // already signed in: add the business to this account, no new sign-up or email code
      if (isUpgrade) {
        await becomeStylist(details);

        return finish("newpro");
      }

      const isNew = await signUpStylist(
        form.email.trim().toLowerCase(),
        form.password,
        takeCaptchaToken(),
        details,
      );

      // the email already has an account: back to w4, which explains and offers log in
      if (!isNew) {
        goTo("w4", "back");

        return setState({ serverErrors: { exists: true } });
      }

      clearSaved();
      setState({ codeKind: "verify" }, () => goTo("verify"));
    });

  return {
    takeCaptchaToken,
    run,
    toStudio,
    finish,
    afterProAuth,
    showWrongPassword,
    showWrongCode,
    createStylist,
  };
};

export type SubmitActions = ReturnType<typeof getSubmitActions>;
