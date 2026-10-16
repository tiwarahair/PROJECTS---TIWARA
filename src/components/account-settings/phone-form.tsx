import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { joinClassNames } from "../../utils/class-names";
import { Reveal } from "./fields";
import type { LoginDetailsActions } from "./login-details-actions";
import { phoneSchema } from "./login-schemas";
import type { PhoneValues } from "./login-schemas";
import type { AccountSettingsController } from "./use-account-settings";
import shared from "../../styles/components/account-settings/index.module.css";
import styles from "../../styles/components/account-settings/login-details.module.css";

interface PhoneFormProps {
  settings: AccountSettingsController;
  login: LoginDetailsActions;
  uid: string;
}

export const PhoneForm = ({ settings, login, uid }: PhoneFormProps) => {
  const { state, setState } = settings;
  const isOpen = !!state.phoneFlow;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<PhoneValues>({
    defaultValues: { phone: "" },
    resolver: zodResolver(phoneSchema),
  });

  useEffect(() => {
    if (isOpen) reset({ phone: "" });
  }, [isOpen, reset]);

  const error = errors.phone?.message;

  const save = handleSubmit(async ({ phone }) => {
    const failure = await login.savePhone(phone);

    if (failure) setError("phone", { message: failure });
  });

  return (
    <Reveal open={isOpen}>
      <form
        className={styles.phoneForm}
        noValidate
        onSubmit={(event) => void save(event)}
      >
        <label className={shared.label} htmlFor={`${uid}-np`}>
          New phone number
        </label>
        <input
          className={joinClassNames(
            styles.phoneInput,
            shared.focusRing,
            error ? shared.fieldErr : shared.fieldOk,
          )}
          data-ac-in="1"
          id={`${uid}-np`}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          aria-invalid={error ? "true" : "false"}
          {...register("phone")}
        />
        {!!error && (
          <div className={shared.error} role="alert">
            {error}
          </div>
        )}
        <div className={shared.actions}>
          <button
            type="submit"
            className={joinClassNames(shared.darkButton, shared.focusRing)}
            data-ac-in="1"
          >
            Save
          </button>
          <button
            type="button"
            className={joinClassNames(styles.cancel, shared.focusRing)}
            data-ac-in="1"
            onClick={() => setState({ phoneFlow: null })}
          >
            Cancel
          </button>
        </div>
      </form>
    </Reveal>
  );
};
