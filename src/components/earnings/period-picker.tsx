import { ChevronDown } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { PERIODS } from "./data";
import { getRange, getRangeLabel } from "./dates";
import type { EarningsController } from "./use-earnings";
import styles from "../../styles/components/earnings/period-picker.module.css";
import { toIsoDate } from "../../utils/dates";

const DATE_FIELDS = [
  ["From", "customFrom"],
  ["To", "customTo"],
] as const;

interface PeriodPickerProps {
  earnings: EarningsController;
}

export const PeriodPicker = ({
  earnings: { state, setState, period, range, lastDay },
}: PeriodPickerProps) => {
  const periodLabel =
    period === "custom"
      ? "Custom"
      : (PERIODS.find(([id]) => id === period)?.[1] ?? "This week");

  const applyCustom = () => {
    if (!state.customFrom || !state.customTo)
      return setState({ customError: "Pick both dates." });

    if (state.customFrom > state.customTo)
      return setState({ customError: "The start date is after the end date." });

    setState({
      period: "custom",
      appliedFrom: state.customFrom,
      appliedTo: state.customTo,
      dropdownOpen: false,
      limit: 15,
      bar: null,
    });
  };

  return (
    <div className={styles.periodWrap}>
      <button
        className={styles.periodButton}
        onClick={() =>
          setState({
            dropdownOpen: !state.dropdownOpen,
            dropdownCustom: period === "custom",
            customFrom: state.appliedFrom || toIsoDate(range.start),
            customTo: state.appliedTo || lastDay(range.end),
            customError: "",
          })
        }
        aria-haspopup="listbox"
        aria-expanded={state.dropdownOpen}
      >
        {periodLabel}
        <ChevronDown
          className={joinClassNames(
            styles.periodChevron,
            state.dropdownOpen ? styles.chevronOpen : styles.chevronClosed,
          )}
          size={16}
          strokeWidth={1.7}
        />
      </button>
      {state.dropdownOpen && (
        <>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div
            className={styles.periodScrim}
            onClick={() => setState({ dropdownOpen: false })}
          ></div>
          <div className={styles.periodMenu} role="listbox">
            {PERIODS.map(([id, label]) => {
              const isOn = period === id;

              return (
                <button
                  key={id}
                  className={joinClassNames(
                    styles.periodOption,
                    isOn ? styles.optionOn : styles.optionOff,
                  )}
                  onClick={() => {
                    if (id === "custom") setState({ dropdownCustom: true });
                    else
                      setState({
                        period: id,
                        dropdownOpen: false,
                        dropdownCustom: false,
                        limit: 15,
                        bar: null,
                      });
                  }}
                  role="option"
                  aria-selected={isOn}
                >
                  <span>{label}</span>
                  <span className={styles.periodHint}>
                    {id === "custom"
                      ? "Pick dates"
                      : getRangeLabel(getRange(id)).replace(/ \d{4}$/, "")}
                  </span>
                </button>
              );
            })}
            {state.dropdownCustom && (
              <div className={styles.customRange}>
                {DATE_FIELDS.map(([label, key]) => (
                  <label key={key} className={styles.dateLabel}>
                    {label}
                    <input
                      className={styles.dateInput}
                      type="date"
                      value={state[key]}
                      onChange={(event) =>
                        setState({
                          [key]: event.target.value,
                          customError: "",
                        })
                      }
                    />
                  </label>
                ))}
                {!!state.customError && (
                  <div className={styles.customError}>{state.customError}</div>
                )}
                <button className={styles.apply} onClick={applyCustom}>
                  Apply
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
