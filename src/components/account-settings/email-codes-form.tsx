import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Clock } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { TextField } from "./fields";
import type { LoginDetailsActions } from "./login-details-actions";
import { getEmailCodesSchema } from "./login-schema";
import type { EmailCodesValues } from "./login-schema";
import type { AccountSettingsController } from "./use-account-settings";
import shared from "../../styles/components/account-settings/index.module.css";
import styles from "../../styles/components/account-settings/email-codes-form.module.css";
import loginDetails from "../../styles/components/account-settings/login-details.module.css";

interface EmailCodesFormProps {
  settings: AccountSettingsController;
  login: LoginDetailsActions;
  uid: string;
}

export const EmailCodesForm = ({
  settings: { state },
  login,
  uid,
}: EmailCodesFormProps) => {
  const { email, pendingEmail, isCurrentEmailConfirmed } = state;

  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors },
  } = useForm<EmailCodesValues>({
    defaultValues: { current: "", next: "" },
    resolver: zodResolver(getEmailCodesSchema(isCurrentEmailConfirmed)),
    reValidateMode: "onSubmit",
  });

  const error = errors.root?.message ?? errors.next?.message;

  const showFailure = (failure: string) =>
    failure && setError("root", { message: failure });

  const confirm = handleSubmit(async (codes) =>
    showFailure(await login.confirmEmail(codes)),
  );

  return (
    <form
      className={styles.pending}
      role="status"
      noValidate
      onSubmit={(event) => void confirm(event)}
    >
      <div className={styles.pendingTitle}>
        <Clock size={16} strokeWidth={1.7} />
        Confirm your new email
      </div>
      <p className={styles.pendingText}>
        We sent a 6-digit code to{" "}
        <strong className={styles.strong}>{email}</strong> and another to{" "}
        <strong className={styles.strong}>{pendingEmail}</strong>. Your login
        email changes once both are in.
      </p>
      <div className={loginDetails.emailForm}>
        {(
          [
            ["current", email],
            ["next", pendingEmail],
          ] as const
        )
          .filter(([key]) => key === "next" || !isCurrentEmailConfirmed)
          .map(([key, address]) => (
            <Controller
              key={key}
              control={control}
              name={key}
              render={({ field: { value, onChange } }) => (
                <TextField
                  id={`${uid}-email-${key}`}
                  label={`Code sent to ${address}`}
                  value={value}
                  error=""
                  onChange={(event) => {
                    clearErrors();
                    onChange(event.target.value.replace(/\D/g, "").slice(0, 6));
                  }}
                  className={styles.codeInput}
                  autoComplete="one-time-code"
                />
              )}
            />
          ))}
      </div>
      {!!error && (
        <div className={shared.error} role="alert">
          {error}
        </div>
      )}
      <div className={styles.pendingActions}>
        <button
          type="submit"
          className={joinClassNames(shared.darkButton, shared.focusRing)}
          data-ac-in="1"
        >
          Confirm
        </button>
        <button
          type="button"
          className={joinClassNames(styles.resend, shared.focusRing)}
          data-ac-in="1"
          onClick={async () => {
            const failure = await login.resendEmailCodes();

            if (failure) showFailure(failure);
            else reset({ current: "", next: "" });
          }}
        >
          Resend codes
        </button>
        <button
          type="button"
          className={joinClassNames(styles.cancelChange, shared.focusRing)}
          data-ac-in="1"
          onClick={login.cancelEmail}
        >
          Cancel change
        </button>
      </div>
    </form>
  );
};
