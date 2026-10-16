import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { joinClassNames } from "../../utils/class-names";
import { Reveal, TextField } from "./fields";
import type { LoginDetailsActions } from "./login-details-actions";
import { getNewEmailSchema } from "./login-schemas";
import type { NewEmailValues } from "./login-schemas";
import type { AccountSettingsController } from "./use-account-settings";
import shared from "../../styles/components/account-settings/index.module.css";
import styles from "../../styles/components/account-settings/login-details.module.css";

interface NewEmailFormProps {
  settings: AccountSettingsController;
  login: LoginDetailsActions;
  uid: string;
}

export const NewEmailForm = ({ settings, login, uid }: NewEmailFormProps) => {
  const { state, setState } = settings;
  const isOpen = state.emailFlow === "edit";

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<NewEmailValues>({
    defaultValues: { email: "" },
    resolver: zodResolver(getNewEmailSchema(state.email)),
  });

  useEffect(() => {
    if (isOpen) reset({ email: "" });
  }, [isOpen, reset]);

  const sendCodes = handleSubmit(async ({ email }) => {
    const failure = await login.sendEmailCodes(email);

    if (failure) setError("email", { message: failure });
  });

  return (
    <Reveal open={isOpen}>
      <form
        className={styles.emailForm}
        noValidate
        onSubmit={(event) => void sendCodes(event)}
      >
        <Controller
          control={control}
          name="email"
          render={({ field: { value, onChange } }) => (
            <TextField
              id={`${uid}-ne`}
              label="New email"
              type="email"
              autoComplete="email"
              value={value}
              error={errors.email?.message ?? ""}
              onChange={onChange}
              className={styles.input}
            />
          )}
        />
        <div className={shared.help}>
          We’ll email a code to this address and one to your current address.
        </div>
        <div className={styles.formActions}>
          <button
            type="submit"
            className={joinClassNames(shared.darkButton, shared.focusRing)}
            data-ac-in="1"
          >
            Send codes
          </button>
          <button
            type="button"
            className={joinClassNames(styles.cancel, shared.focusRing)}
            data-ac-in="1"
            onClick={() => setState({ emailFlow: null })}
          >
            Cancel
          </button>
        </div>
      </form>
    </Reveal>
  );
};
