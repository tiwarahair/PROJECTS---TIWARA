import { joinClassNames } from "../../../../../utils/class-names";
import { dayInfo, getMiniCalendarDays } from "../../../core/format";
import type { StudioState } from "../../../core/types";
import type { StudioController } from "../../../core/use-studio";
import styles from "../../../../../styles/features/studio/settings/availability/block-sheet/day-picker.module.css";
import {
  getMonthNav,
  MonthCalendar,
  CalendarToggle,
} from "../../../shell/month-calendar";

export interface DayPickerProps {
  studio: StudioController;
  setDraft: (patch: Partial<StudioState["blockDraft"]>) => void;
}

export const DayPicker = ({ studio, setDraft }: DayPickerProps) => {
  const { state, setState } = studio;
  const draft = state.blockDraft;
  const selected = draft.day || 0;
  const first = selected > 6 ? selected - 3 : 0;

  const monthNav = getMonthNav(
    studio,
    "blockCalendarMonth",
    "blockCalendarYear",
  );

  return (
    <>
      <div className={styles.dayHead}>
        <div className={styles.label500}>Day</div>
        <CalendarToggle
          isOpen={state.blockCalendarOpen}
          onClick={() => {
            const today = new Date();

            setState({
              blockCalendarOpen: !state.blockCalendarOpen,
              blockCalendarMonth: state.blockCalendarMonth ?? today.getMonth(),
              blockCalendarYear: state.blockCalendarYear ?? today.getFullYear(),
            });
          }}
        />
      </div>
      {!state.blockCalendarOpen && (
        <div className={styles.dayStrip}>
          {Array.from({ length: 7 }, (_slot, index) => {
            const offset = first + index;
            const info = dayInfo(offset);

            return (
              <button
                key={offset}
                className={joinClassNames(
                  styles.dayChip,
                  selected === offset && styles.dayChipOn,
                )}
                onClick={() => setDraft({ day: offset })}
              >
                <div className={styles.chipDow}>{info.weekday}</div>
                <div className={styles.chipNum}>{info.dayNumber}</div>
              </button>
            );
          })}
        </div>
      )}
      {state.blockCalendarOpen && (
        <MonthCalendar
          className={styles.monthIn}
          monthNav={monthNav}
          days={getMiniCalendarDays(
            monthNav.month,
            monthNav.year,
            draft.day,
            (offset) => setDraft({ day: offset }),
            0,
          )}
        />
      )}
    </>
  );
};
