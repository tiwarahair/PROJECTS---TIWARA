import { joinClassNames } from "../../../utils/class-names";
import type { EditFormController } from "./use-edit-form";
import styles from "../../../styles/features/account/personal-section/name-edit.module.css";
import ui from "../../../styles/features/account/ui.module.css";

const NAME_FIELDS = [
  ["first", "First name", "given-name"],
  ["last", "Last name", "family-name"],
] as const;

interface NameEditProps {
  personal: EditFormController;
}

export const NameEdit = ({
  personal: {
    form: { register },
    errors,
    getBorderClass,
  },
}: NameEditProps) => (
  <div className={styles.nameGrid}>
    {NAME_FIELDS.map(([key, label, autoComplete]) => (
      <label key={key} className={ui.label}>
        {label}{" "}
        <input
          className={joinClassNames(ui.input, getBorderClass(key))}
          {...register(key)}
          autoComplete={autoComplete}
          aria-invalid={errors[key] ? "true" : "false"}
          aria-describedby={`ac-e-${key}`}
        />
        <span className={ui.error} id={`ac-e-${key}`}>
          {errors[key]?.message}
        </span>
      </label>
    ))}
  </div>
);
