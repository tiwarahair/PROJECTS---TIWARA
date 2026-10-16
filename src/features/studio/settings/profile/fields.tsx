import { useController } from "react-hook-form";
import type { InputHTMLAttributes } from "react";
import { joinClassNames } from "../../../../utils/class-names";
import { Field } from "../page-parts";
import type { SettingsView } from "../view";
import type { ProfileValues } from "./schema";
import type { ProfileForm } from "./use-profile-form";
import styles from "../../../../styles/features/studio/settings/profile/index.module.css";

interface ProfileFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "name" | "value" | "onChange" | "form"
> {
  name: Exclude<keyof ProfileValues, "about" | "portfolioCount">;
  label: string;
  profileForm: ProfileForm;
  view: SettingsView;
  isLive?: boolean;
}

export const ProfileField = ({
  name,
  label,
  profileForm,
  view,
  isLive = false,
  ...inputProps
}: ProfileFieldProps) => {
  const {
    field: { value, onChange, onBlur, ref },
    fieldState: { error },
  } = useController({ control: profileForm.control, name });

  const message = error?.message;
  const errorId = `${name}-error`;

  return (
    <Field label={label}>
      <input
        className={joinClassNames(styles.input, message && styles.inputError)}
        ref={ref}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          view.setProfile({ [name]: event.target.value });

          if (isLive) void profileForm.trigger(name);
        }}
        onBlur={onBlur}
        aria-invalid={message ? "true" : "false"}
        aria-describedby={message ? errorId : undefined}
        {...inputProps}
      />
      {message && (
        <span id={errorId} role="alert" className={styles.fieldError}>
          {message}
        </span>
      )}
    </Field>
  );
};
