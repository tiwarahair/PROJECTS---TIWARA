// What each onboarding screen sends to the server, and where it goes next.
import { useEffect, useRef } from "react";
import { becomeStylist } from "../../lib/account-changes";
import {
  completeClientProfile,
  getAccountKind,
  getSignedInAccount,
  resendEmailCode,
  sendPasswordReset,
  setNewPassword,
  signIn,
  signOut,
  signUpClient,
  signUpStylist,
  startGoogleSignIn,
  verifyEmailCode,
} from "../../lib/auth";
import { needsSecondFactor, verifySecondFactor } from "../../lib/two-factor";
import type { StylistDetails } from "../../types/auth";
import { toStoredBusinessType } from "../../utils/business-type";
import { rememberDevice } from "../../lib/supabase";
import { TURNSTILE_SCREENS } from "./onboarding-data";
import { EMPTY_CODE, isCodeScreen } from "./onboarding-state";
import type { OnboardingForm } from "./onboarding-state";
import type { OnboardingCore } from "./use-onboarding";

const LOCK_MS = 9e5;
const MAX_ATTEMPTS = 5;
const NEXT_WIZARD_SCREEN = { w1: "w2", w2: "w3" };

interface SubmitCore extends OnboardingCore {
  /** Places the address (or mobile postcode); false when Google can't. */
  geocode: () => Promise<boolean>;
}

export const useOnboardingSubmit = ({
  stateRef,
  isUpgrade,
  setState,
  goTo,
  later,
  save,
  clearSaved,
  navigate,
  resolved,
  startFlow,
  turnstileRef,
  geocode,
  formApi: { getValues, reset, handleSubmit },
}: SubmitCore) => {
  /** Uses up the current Turnstile token and asks the widget for a fresh one. */
  const takeCaptchaToken = () => {
    const token = stateRef.current.captchaToken ?? "";

    setState({ captchaToken: null });
    turnstileRef.current?.reset();

    return token;
  };

  /** Runs a server call with the busy state; unexpected failures show the connection error. */
  const run = (task: () => Promise<void>) => {
    setState({ busy: true, networkError: false });

    task().catch(() => setState({ busy: false, networkError: true }));
  };

  const toStudio = (isNew: boolean) => {
    goTo("studio");

    if (!resolved.stayOnDone)
      later(
        "studio",
        () =>
          navigate(`/studio${isNew ? "?welcome=1" : ""}`, { replace: true }),
        500,
      );
  };

  const finish = (
    kind: "customer-login" | "customer-new" | "newpro" | "pro",
  ) => {
    if (kind === "customer-login" || kind === "customer-new") {
      const first = getValues("first").trim();

      const message =
        kind === "customer-new"
          ? `Welcome to Tiwára’s House${first ? `, ${first}` : ""}`
          : `Welcome back${first ? `, ${first}` : ""}`;

      if (resolved.stayOnDone) {
        setState({ busy: false, toast: message });

        return;
      }

      try {
        sessionStorage.setItem("tw_toast", message);
        sessionStorage.removeItem("tw_return");
      } catch {
        // storage unavailable
      }

      setState({ busy: true });
      navigate(stateRef.current.returnTo || "/", { replace: true });

      return;
    }

    if (kind === "newpro") {
      clearSaved();
      setState({ busy: false });
      goTo("pro-done");

      return;
    }

    toStudio(false);
  };

  const afterProAuth = async () => {
    if (await needsSecondFactor())
      setState({ codeKind: "2fa" }, () => goTo("pro-2fa"));
    else finish("pro");
  };

  const getStylistDetails = (form: OnboardingForm): StylistDetails => {
    const { pinLatLng, geocodedLatLng, area } = stateRef.current;
    const location = pinLatLng ?? geocodedLatLng;

    // w3 can't be passed without a location; saved progress always carries it
    if (!location) throw new Error("The business location is missing");

    const [lat, lng] = location;
    const isMobile = form.type === "mobile";

    return {
      ...form,
      businessName: form.businessName,
      businessType: toStoredBusinessType(form.type),
      lat,
      lng,
      areaLabel: area,
      travelRadiusMiles: isMobile ? form.radius : null,
      contactEmail: form.useContact ? form.email : form.businessEmail || null,
      contactPhone: form.useContact ? form.mobile : form.businessPhone || null,
      referralSource:
        form.referralSource === "Other"
          ? form.referralSourceOther
          : form.referralSource,
    };
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

  const submit = () => {
    const { busy, lockedUntil } = stateRef.current;

    if (busy || lockedUntil > Date.now()) return;

    void handleSubmit(submitValid)();
  };

  const submitValid = () => {
    const current = stateRef.current;
    const { screen } = current;

    const isWaitingForCheck =
      !!screen &&
      TURNSTILE_SCREENS.includes(screen) &&
      !isUpgrade &&
      !current.captchaToken;

    if (isWaitingForCheck) return setState({ busy: true, submitArmed: true });

    const form = getValues();
    const email = form.email.trim().toLowerCase();

    if (screen === "w3")
      return run(async () => {
        const { geocodedLatLng, pinLatLng } = stateRef.current;

        if (
          (form.type === "mobile" || !(pinLatLng ?? geocodedLatLng)) &&
          !(await geocode())
        )
          return setState({
            busy: false,
            serverErrors: {
              [form.type === "mobile" ? "postcode" : "address"]:
                "We can’t find that. Check it and try again.",
            },
          });

        save();
        goTo("w4");
      });

    if (screen === "w1" || screen === "w2") {
      save();
      goTo(NEXT_WIZARD_SCREEN[screen]);

      return;
    }

    if (screen === "cust-email")
      return run(async () => {
        const kind = await getAccountKind(email, takeCaptchaToken());

        goTo(kind === "none" ? "cust-create" : "cust-password");
      });

    // w4 makes no server call: w5's sign-up is the stylist flow's one Turnstile check
    if (screen === "w4")
      return setState({ audience: "newpro" }, () => goTo("w5"));

    if (screen === "pro-email")
      return run(async () => {
        const kind = await getAccountKind(email, takeCaptchaToken());

        if (kind === "stylist") goTo("pro-password");
        else setState({ busy: false, serverErrors: { noBusiness: true } });
      });

    if (screen === "cust-password" || screen === "pro-password")
      return run(async () => {
        const error = await signIn(email, form.password, takeCaptchaToken());

        if (error === "invalid_credentials") return showWrongPassword();

        if (error === "email_not_confirmed")
          return setState({ codeKind: "verify", resendIn: 0 }, () => {
            goTo("verify");
            resend();
          });

        if (screen === "pro-password") await afterProAuth();
        else finish("customer-login");
      });

    if (screen === "cust-create")
      return run(async () => {
        const isNew = await signUpClient(
          email,
          form.password,
          takeCaptchaToken(),
          form,
        );

        if (!isNew)
          return setState({ busy: false, serverErrors: { exists: true } });

        setState({ codeKind: "verify", audience: "customer" }, () =>
          goTo("verify"),
        );
      });

    if (screen === "w5") return createStylist();

    if (screen === "cust-social")
      return run(async () => {
        await completeClientProfile(form);
        finish("customer-new");
      });

    if (screen === "forgot-email")
      return run(async () => {
        await sendPasswordReset(email, takeCaptchaToken());
        goTo("forgot-sent");
      });

    if (screen === "forgot-reset")
      return run(async () => {
        const error = await setNewPassword(form.password);

        if (error)
          return setState({
            busy: false,
            serverErrors: {
              password:
                error === "same_password"
                  ? "Choose a password you haven’t used before"
                  : "Choose a stronger password",
            },
          });

        goTo("forgot-done");
      });

    if (isCodeScreen(screen)) {
      const code = current.code.join("");

      if (code.length < 6) {
        setState({ busy: false, codeError: "Enter the 6-digit code" });

        return;
      }

      return run(async () => {
        const isRight =
          screen === "pro-2fa"
            ? await verifySecondFactor(code, current.twoFaMethod === "backup")
            : await verifyEmailCode(email, code);

        if (!isRight) return showWrongCode();

        await rememberDevice(form.remember);

        if (screen === "pro-2fa") finish("pro");
        else
          finish(current.audience === "customer" ? "customer-new" : "newpro");
      });
    }
  };

  /** Resend the sign-up code (verify) or the reset link (forgot-sent). */
  const resending = useRef(false);

  /** Sends the code (verify) or reset link (forgot-sent) again with this token. */
  const sendAgain = (token: string) => {
    if (resending.current) return;

    resending.current = true;

    setState({
      resendArmed: false,
      captchaToken: null,
      resendIn: 30,
      codeError: "",
      code: EMPTY_CODE,
    });

    turnstileRef.current?.reset();

    const email = getValues("email").trim().toLowerCase();

    const sending =
      stateRef.current.screen === "forgot-sent"
        ? sendPasswordReset(email, token)
        : resendEmailCode(email, token);

    sending
      .catch(() => setState({ networkError: true, resendIn: 0 }))
      .finally(() => {
        resending.current = false;
      });
  };

  /** Without a token yet, Resend first loads the check; its token then sends (setCaptchaToken). */
  const resend = () => {
    const { captchaToken } = stateRef.current;

    if (captchaToken) sendAgain(captchaToken);
    else setState({ resendArmed: true });
  };

  /** Google redirects away; the return lands on /login?flow=social(-pro). */
  const socialSignIn = (isPro: boolean) => run(() => startGoogleSignIn(isPro));

  // back from Google: stylists go on to 2FA, new customers finish their profile
  useEffect(() => {
    const flow = startFlow;

    if (flow !== "social" && flow !== "social-pro") return;

    run(async () => {
      const account = await getSignedInAccount();

      // no session: they backed out at Google, so just show the chooser
      if (!account) return setState({ busy: false });

      reset({ ...getValues(), ...account });

      if (flow === "social-pro") {
        if (account.isStylist) return afterProAuth();

        await signOut();

        return setState(
          { busy: false, serverErrors: { noBusiness: true } },
          () => goTo("pro-email"),
        );
      }

      if (account.hasProfile || account.isStylist)
        return finish("customer-login");

      setState({ audience: "customer", socialProvider: "google" }, () =>
        goTo("cust-social"),
      );
    });
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { submit, resend, sendAgain, socialSignIn, toStudio, createStylist };
};
