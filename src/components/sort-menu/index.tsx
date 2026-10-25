import { Check, ChevronDown } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/sort-menu/index.module.css";

export interface SortMenuProps<Key extends string> {
  label: string;
  ariaLabel: string;
  options: readonly (readonly [Key, string])[];
  value: Key;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onPick: (key: Key) => void;
  align?: "left" | "right";
  isSet?: boolean;
  isValueOnly?: boolean;
  pillText?: string;
}

/** The search page's "Sort: …" pill and its menu; also used for filters. */
export const SortMenu = <Key extends string>({
  label,
  ariaLabel,
  options,
  value,
  isOpen,
  onToggle,
  onClose,
  onPick,
  align = "right",
  isSet = false,
  isValueOnly = false,
  pillText,
}: SortMenuProps<Key>) => {
  const selected = options.find(([key]) => key === value);
  const selectedLabel = selected ? selected[1] : "";

  return (
    <div className={styles.anchor}>
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen ? "true" : "false"}
        aria-label={isValueOnly ? `${label}: ${selectedLabel}` : undefined}
        className={joinClassNames(styles.pill, isSet && styles.pillSet)}
      >
        {pillText ??
          (isValueOnly ? selectedLabel : `${label}: ${selectedLabel}`)}
        <ChevronDown className={styles.icon} size={14} strokeWidth={2} />
      </button>
      {isOpen && (
        <>
          <div onClick={onClose} className={styles.scrim}></div>
          <div
            data-dd=""
            role="listbox"
            aria-label={ariaLabel}
            className={joinClassNames(
              styles.popover,
              align === "left" ? styles.popoverLeft : styles.popoverRight,
            )}
          >
            {options.map(([key, optionLabel]) => {
              const isSelected = key === value;

              return (
                <button
                  key={key}
                  type="button"
                  role="option"
                  aria-selected={isSelected ? "true" : "false"}
                  onClick={() => onPick(key)}
                  className={joinClassNames(
                    styles.option,
                    isSelected && styles.optionOn,
                  )}
                >
                  <span className={styles.optionLabel}>{optionLabel}</span>
                  {isSelected && (
                    <Check
                      className={styles.icon}
                      size={14}
                      strokeWidth={2.4}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
