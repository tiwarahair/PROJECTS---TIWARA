import {
  checkNewPassword,
  completeClientProfile,
  getAccountKind,
  sendPasswordReset,
  setNewPassword,
  signIn,
  signUpClient,
  verifyEmailCode,
} from "../../lib/auth";
import type { NewPasswordProblem } from "../../lib/auth";
import { rememberDevice } from "../../lib/supabase";
import { trustThisDevice } from "../../lib/trusted-devices";
import { needsSecondFactor, verifySecondFactor } from "../../lib/two-factor";
import { getPasswordProblemMessage } from "../../utils/password";
import { TURNSTILE_SCREENS } from "./data";
import { getPasswordCheck } from "./field-schemas";
import { clearLoginLock, getLoginLock } from "./login-lock";
import { isCodeScreen } from "./state";
import type { SubmitActions, SubmitCore } from "./submit-actions";

/** What Continue does on each screen once the form is valid. */
export const getSubmitValid = (
  { stateRef, isUpgrade, setState, goTo, save, geocode, formApi }: SubmitCore,
  {
    takeCaptchaToken,
    run,
    finish,
    afterProAuth,
    showWrongPassword,
    showWrongCode,
    createStylist,
  }: SubmitActions,
  resend: () => void,
) => {
  const saveAndGo = (screen: string) => {
    save();
    goTo(screen);
  };

  return () => {
    const current = stateRef.current;
    const { screen } = current;

    const isWaitingForCheck =
      !!screen &&
      TURNSTILE_SCREENS.includes(screen) &&
      !isUpgrade &&
      !current.captchaToken;

    if (isWaitingForCheck) return setState({ busy: true, submitArmed: true });

    const form = formApi.getValues();
    const email = form.email.trim().toLowerCase();

    const showPasswordProblem = (problem: NewPasswordProblem) =>
      setState({
        busy: false,
        serverErrors: {
          password: getPasswordProblemMessage(
            problem,
            getPasswordCheck({ ...current, form }).min,
          ),
        },
      });

    const saveReset = async () => {
      const error = await setNewPassword(form.password);

      if (!error) return goTo("forgot-done");

      if (screen !== "forgot-reset") goTo("forgot-reset", "back");

      setState({
        busy: false,
        serverErrors: {
          password:
            error === "same_password"
              ? "Choose a password you haven’t used before"
              : "Choose a stronger password",
        },
      });
    };

    const checkAccount = (onKind: (kind: string) => void) =>
      run(async () => onKind(await getAccountKind(email, takeCaptchaToken())));

    const submitPassword = () => {
      const lock = getLoginLock(email);

      if (lock.lockedUntil > Date.now())
        return setState({
          busy: false,
          ...lock,
          serverErrors: {
            password: "Too many attempts. Try again in 15 minutes.",
          },
        });

      run(async () => {
        const error = await signIn(email, form.password, takeCaptchaToken());

        if (error === "invalid_credentials") return showWrongPassword(email);

        clearLoginLock(email);

        if (error === "email_not_confirmed")
          return setState({ codeKind: "verify", resendIn: 0 }, () => {
            goTo("verify");
            resend();
          });

        if (screen === "pro-password") await afterProAuth();
        else finish("customer-login");
      });
    };

    const submitCode = () => {
      const code = current.code.join("");

      if (code.length < 6)
        return setState({ busy: false, codeError: "Enter the 6-digit code" });

      run(async () => {
        const isRight =
          screen === "pro-2fa"
            ? await verifySecondFactor(code)
            : await verifyEmailCode(email, code);

        if (!isRight) return showWrongCode();

        if (current.codeKind === "reset") return saveReset();

        const isSignInCode = screen === "pro-2fa";

        await rememberDevice(true);

        if (isSignInCode && form.trustDevice && current.canTrustDevice)
          await trustThisDevice();

        if (isSignInCode) finish("pro");
        else
          finish(current.audience === "customer" ? "customer-new" : "newpro");
      });
    };

    const screens: Record<string, () => void> = {
      w1: () => saveAndGo("w2"),
      w2: () => saveAndGo("w3"),
      w3: () =>
        run(async () => {
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

          saveAndGo("w4");
        }),
      "cust-email": () =>
        checkAccount((kind) =>
          goTo(kind === "none" ? "cust-create" : "cust-password"),
        ),
      // w4 makes no server call: w5's sign-up is the stylist flow's one Turnstile check
      w4: () => setState({ audience: "newpro" }, () => goTo("w5")),
      "pro-email": () =>
        checkAccount((kind) => {
          if (kind === "stylist") goTo("pro-password");
          else setState({ busy: false, serverErrors: { noBusiness: true } });
        }),
      "cust-password": submitPassword,
      "pro-password": submitPassword,
      "cust-create": () =>
        run(async () => {
          const { first, last } = form;

          const problem = await checkNewPassword(form.password, "client", {
            first,
            last,
            email,
          });

          if (problem) return showPasswordProblem(problem);

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
        }),
      w5: () => createStylist(),
      "cust-social": () =>
        run(async () => {
          await completeClientProfile(form);
          finish("customer-new");
        }),
      "forgot-email": () =>
        run(async () => {
          await sendPasswordReset(email, takeCaptchaToken());
          goTo("forgot-sent");
        }),
      "forgot-reset": () =>
        run(async () => {
          const problem = await checkNewPassword(form.password);

          if (problem) return showPasswordProblem(problem);

          // Supabase only lets a two-factor account change its password after the authenticator code
          if (await needsSecondFactor())
            return setState({ codeKind: "reset" }, () => goTo("pro-2fa"));

          await saveReset();
        }),
    };

    if (isCodeScreen(screen)) return submitCode();

    if (screen) screens[screen]?.();
  };
};
