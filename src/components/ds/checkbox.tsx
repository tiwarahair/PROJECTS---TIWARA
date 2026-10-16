import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/ds/choice.module.css";
import { useControllable } from "./use-controllable";

/** Checkbox with label; controlled (checked) or uncontrolled (defaultChecked). */
export interface CheckboxProps {
  label?: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}

export const Checkbox = ({
  label,
  checked,
  defaultChecked = false,
  onChange,
  disabled = false,
}: CheckboxProps) => {
  const [isChecked, setChecked] = useControllable(checked, defaultChecked);

  const toggle = () => {
    if (disabled) return;

    const next = !isChecked;

    setChecked(next);
    onChange?.(next);
  };

  return (
    <label
      className={joinClassNames(styles.label, disabled && styles.disabled)}
      onClick={(event) => {
        event.preventDefault();
        toggle();
      }}
    >
      <span
        className={joinClassNames(styles.box, isChecked && styles.boxChecked)}
      >
        {isChecked && <Check size={12} strokeWidth={3} color="#fffefb" />}
      </span>
      {label}
    </label>
  );
};
