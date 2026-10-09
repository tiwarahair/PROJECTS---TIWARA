import type { ReactNode } from "react";
import { joinClassNames } from "../../utils/class-names";
import styles from "./choice.module.css";
import { useControllable } from "./use-controllable";

/** Toggle switch; controlled or uncontrolled. */
export interface SwitchProps {
  label?: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}

export const Switch = ({
  label,
  checked,
  defaultChecked = false,
  onChange,
  disabled = false,
}: SwitchProps) => {
  const [isOn, setOn] = useControllable(checked, defaultChecked);
  const toggle = () => {
    if (disabled) return;
    const next = !isOn;
    setOn(next);
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
      <span className={joinClassNames(styles.track, isOn && styles.trackOn)}>
        <span className={styles.thumb}></span>
      </span>
      {label}
    </label>
  );
};
