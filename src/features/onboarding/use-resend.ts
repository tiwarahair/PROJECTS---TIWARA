import { useRef } from "react";
import { resendEmailCode, sendPasswordReset } from "../../lib/auth";
import { getAuthFailure } from "../../lib/auth-errors";
import { EMPTY_CODE } from "./state";
import type { OnboardingCore } from "./use-onboarding";

export const useResend = ({
  stateRef,
  setState,
  turnstileRef,
  formApi: { getValues },
}: OnboardingCore) => {
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
      .then(
        () => setState({ failure: null }),
        (error: unknown) =>
          setState({
            failure: getAuthFailure(error),
            isResendFailure: true,
            resendIn: 0,
          }),
      )
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

  return { sendAgain, resend };
};
