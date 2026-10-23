import { Calendar } from "lucide-react";
import { joinClassNames } from "../../../../../utils/class-names";
import { dayInfo } from "../../../core/format";
import type { StudioState } from "../../../core/types";
import type { StudioController } from "../../../core/use-studio";
import styles from "../../../../../styles/features/studio/settings/availability/block-sheet/repeat-fields.module.css";
import fields from "../../../../../styles/features/studio/settings/availability/sheet-fields.module.css";

const FREQUENCIES = [
  { value: "none", label: "Doesn't repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export interface RepeatFieldsProps {
  studio: StudioController;
  setDraft: (patch: Partial<StudioState["blockDraft"]>) => void;
}

export const RepeatFields = ({ studio, setDraft }: RepeatFieldsProps) => {
  const { state, setState } = studio;
  const draft = state.blockDraft;
  const frequency = draft.frequency || "none";
  const ends = draft.ends || "never";
  const isRepeating = frequency !== "none";

  const endDayInfo =
    draft.endDayOffset != null ? dayInfo(draft.endDayOffset) : null;

  return (
    <>
      <label className={fields.field}>
        <span className={fields.fieldLabel}>Repeats</span>
        <select
          className={styles.select}
          defaultValue={frequency}
          onChange={(event) => setDraft({ frequency: event.target.value })}
        >
          {FREQUENCIES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {isRepeating && (
        <>
          <label className={fields.field}>
            <span className={fields.fieldLabel}>Ends</span>
            <select
              className={styles.select}
              defaultValue={ends}
              onChange={(event) => setDraft({ ends: event.target.value })}
            >
              <option value="never">Never</option>
              <option value="date">After specific date</option>
            </select>
          </label>
          {ends === "date" && (
            <button
              className={joinClassNames(
                styles.endDate,
                draft.endDayOffset != null && styles.endDateSet,
              )}
              onClick={() => {
                const today = new Date();

                setState({
                  endCalendarOpen: true,
                  endCalendarOut: false,
                  endCalendarMonth: state.endCalendarMonth ?? today.getMonth(),
                  endCalendarYear: state.endCalendarYear ?? today.getFullYear(),
                });
              }}
            >
              {endDayInfo
                ? `${endDayInfo.weekday} ${endDayInfo.dayNumber} ${endDayInfo.monthName}`
                : "Pick a date"}
              <Calendar size={15} strokeWidth={1.7} />
            </button>
          )}
        </>
      )}
    </>
  );
};
