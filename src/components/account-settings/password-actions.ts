import type { UseFormReturn } from "react-hook-form";
import { PASSWORD_FAILURES } from "../../lib/account-changes";
import type { AccountSettingsBackend } from "./backend";
import type { SettingsState } from "./logic";
import { EMPTY_PASSWORD } from "./password-schema";
import type { PasswordValues } from "./password-schema";

interface PasswordContext {
  backend: AccountSettingsBackend;
  passwordForm: UseFormReturn<PasswordValues>;
  state: SettingsState;
  setState: (patch: Partial<SettingsState>) => void;
  toast: (text: string) => void;
  loadSessions: () => unknown;
  isSocial: boolean;
}

export const getPasswordActions = ({
  backend,
  passwordForm,
  state,
  setState,
  toast,
  loadSessions,
  isSocial,
}: PasswordContext) => {
  const sendCode = () =>
    backend
      .sendPasswordCode()
      .then(() => {
        passwordForm.clearErrors("root");
        setState({ isPasswordCodeSent: true });
        toast(`We emailed a code to ${state.email}`);
      })
      .catch(() => toast("The code couldn’t be sent. Try again."));

  const save = () =>
    passwordForm.handleSubmit(async ({ code, newPassword }) => {
      const failure = await backend
        .changePassword(newPassword, code, state.signOthers)
        .catch(() => "failed");

      // signed in over 24 hours ago: Supabase wants the emailed code first
      if (failure === "reauthentication_needed") return sendCode();

      if (failure)
        return passwordForm.setError(
          failure === "reauthentication_not_valid" ? "code" : "root",
          { message: PASSWORD_FAILURES[failure] ?? PASSWORD_FAILURES.failed },
        );

      const others = state.signOthers
        ? state.sessions.filter(({ isCurrent }) => !isCurrent).length
        : 0;

      passwordForm.reset(EMPTY_PASSWORD);

      setState({
        isPasswordCodeSent: false,
        isSettingPassword: false,
        trustedDevices: [],
      });

      if (state.signOthers) loadSessions();

      const deviceSuffix = others === 1 ? "" : "s";

      const updatedText = others
        ? `Password updated. Signed out of ${others} other device${deviceSuffix}`
        : "Password updated";

      toast(isSocial ? "Password set" : updatedText);
    })();

  return { sendCode, save };
};
