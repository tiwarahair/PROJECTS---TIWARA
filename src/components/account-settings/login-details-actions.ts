// Settings → Personal: the login email (a code to each address) and the mobile (saved straight away).
import { EMAIL_CODE_FAILURES } from "../../lib/account-changes";
import type { AccountSettingsController } from "./use-account-settings";

export const getLoginDetailsActions = ({
  state,
  setState,
  toast,
  backend,
}: AccountSettingsController) => {
  const sendEmailCodes = async (email: string) => {
    const failure = await backend.sendEmailCodes(email).catch(() => "failed");

    if (failure)
      return EMAIL_CODE_FAILURES[failure] ?? EMAIL_CODE_FAILURES.failed ?? "";

    setState({
      emailFlow: null,
      pendingEmail: email,
      isCurrentEmailConfirmed: false,
    });

    toast("Codes sent");

    return "";
  };

  return {
    sendEmailCodes,
    resendEmailCodes: () => sendEmailCodes(state.pendingEmail),
    // the change only happens once both codes are in; a confirmed first code isn't asked for again
    confirmEmail: async ({
      current,
      next,
    }: {
      current: string;
      next: string;
    }) => {
      const { email, pendingEmail, isCurrentEmailConfirmed } = state;

      try {
        if (!isCurrentEmailConfirmed) {
          if (!(await backend.verifyEmailCode(email, current)))
            return `The code sent to ${email} isn’t right or has expired.`;

          setState({ isCurrentEmailConfirmed: true });
        }

        if (!(await backend.verifyEmailCode(pendingEmail, next)))
          return `The code sent to ${pendingEmail} isn’t right or has expired.`;
      } catch {
        return "That didn’t work. Try again.";
      }

      setState({ email: pendingEmail, pendingEmail: "" });
      toast("Login email updated");

      return "";
    },
    cancelEmail: () => {
      setState({ pendingEmail: "" });
      toast("Email change cancelled");
    },
    savePhone: async (phone: string) => {
      try {
        await backend.savePhone(phone);
      } catch {
        return "Your number couldn’t be saved. Try again.";
      }

      setState({ phone, phoneFlow: null });
      toast("Mobile updated");

      return "";
    },
  };
};

export type LoginDetailsActions = ReturnType<typeof getLoginDetailsActions>;
