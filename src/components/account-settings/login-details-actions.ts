// Settings → Personal: the login email (a code to each address) and the mobile (saved straight away).
import { isValidEmail, isValidMobile } from "../../utils/validation";
import type { AccountSettingsController } from "./use-account-settings";

const EMAIL_FAILURES: Record<string, string> = {
  email_exists: "That email is already used by another account.",
  over_email_send_rate_limit:
    "Too many emails sent. Wait a minute, then try again.",
  failed: "The codes couldn’t be sent. Try again.",
};

export const getLoginDetailsActions = ({
  state,
  setState,
  toast,
  backend,
}: AccountSettingsController) => {
  const sendEmailCodes = async (email: string) => {
    const failure = await backend.sendEmailCodes(email).catch(() => "failed");

    if (failure)
      return setState({
        emailError: EMAIL_FAILURES[failure] ?? EMAIL_FAILURES.failed,
      });

    setState({
      emailFlow: null,
      pendingEmail: email,
      emailCodes: { current: "", next: "" },
      isCurrentEmailConfirmed: false,
      emailError: "",
    });

    toast("Codes sent");
  };

  return {
    startEmailChange: () => {
      const email = state.newEmail.trim().toLowerCase();

      if (!isValidEmail(email)) return setState({ emailTouched: true });

      if (email === state.email.toLowerCase())
        return setState({ emailError: "That’s already your login email." });

      return sendEmailCodes(email);
    },
    resendEmailCodes: () => sendEmailCodes(state.pendingEmail),
    setEmailCode: (key: "current" | "next", value: string) =>
      setState(({ emailCodes }) => ({
        emailCodes: {
          ...emailCodes,
          [key]: value.replace(/\D/g, "").slice(0, 6),
        },
        emailError: "",
      })),
    // the change only happens once both codes are in; a confirmed first code isn't asked for again
    confirmEmail: async () => {
      const { email, pendingEmail, emailCodes, isCurrentEmailConfirmed } =
        state;

      if (
        !/^\d{6}$/.test(emailCodes.next) ||
        (!isCurrentEmailConfirmed && !/^\d{6}$/.test(emailCodes.current))
      )
        return setState({ emailError: "Enter both 6-digit codes." });

      try {
        if (!isCurrentEmailConfirmed) {
          if (!(await backend.verifyEmailCode(email, emailCodes.current)))
            return setState({
              emailError: `The code sent to ${email} isn’t right or has expired.`,
            });

          setState({ isCurrentEmailConfirmed: true });
        }

        if (!(await backend.verifyEmailCode(pendingEmail, emailCodes.next)))
          return setState({
            emailError: `The code sent to ${pendingEmail} isn’t right or has expired.`,
          });
      } catch {
        return setState({ emailError: "That didn’t work. Try again." });
      }

      setState({ email: pendingEmail, pendingEmail: "", emailError: "" });
      toast("Login email updated");
    },
    cancelEmail: () => {
      setState({ pendingEmail: "", emailError: "" });
      toast("Email change cancelled");
    },
    savePhone: async () => {
      if (!isValidMobile(state.newPhone))
        return setState({
          phoneError: "Enter a UK mobile number, like 07700 900418.",
        });

      try {
        await backend.savePhone(state.newPhone.trim());
      } catch {
        return setState({
          phoneError: "Your number couldn’t be saved. Try again.",
        });
      }

      setState({ phone: state.newPhone.trim(), phoneFlow: null, newPhone: "" });
      toast("Mobile updated");
    },
  };
};
