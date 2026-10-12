import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/ds/choice.module.css";
import { useControllable } from "./use-controllable";

/** Radio group; pass string options. */
export interface RadioProps {
  options?: string[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
  direction?: "column" | "row";
}

export const Radio = ({
  options = [],
  value,
  defaultValue,
  onChange,
  disabled = false,
  direction = "column",
}: RadioProps) => {
  const [selected, setSelected] = useControllable(value, defaultValue);

  return (
    <div
      role="radiogroup"
      className={joinClassNames(
        styles.group,
        direction === "row" && styles.row,
      )}
    >
      {options.map((option) => (
        <label
          key={option}
          className={joinClassNames(styles.label, disabled && styles.disabled)}
          onClick={() => {
            if (disabled) return;

            setSelected(option);
            onChange?.(option);
          }}
        >
          <span
            className={joinClassNames(
              styles.dot,
              selected === option && styles.dotSelected,
            )}
          ></span>
          {option}
        </label>
      ))}
    </div>
  );
};
