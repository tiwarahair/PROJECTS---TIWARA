import type { ReactNode } from "react";
import { joinClassNames } from "../../utils/class-names";
import styles from "./choice.module.css";
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
        {isChecked && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fffefb"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>
      {label}
    </label>
  );
};
