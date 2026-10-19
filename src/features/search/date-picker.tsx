import { ChevronLeft, ChevronRight } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import controls from "../../styles/features/search/controls.module.css";
import {
  getCalendarCells,
  getQuickDays,
  getVisibleMonth,
  HOURS,
  TIMES,
} from "./dates";
import pageGlobal from "../../styles/features/search/index-global.module.css";
import styles from "../../styles/features/search/date-picker.module.css";
import type { SearchController } from "./use-search";
import { MONDAY_FIRST_WEEKDAYS } from "../../utils/dates";

interface PickerProps {
  search: SearchController;
}

const QuickDays = ({ search: { state, actions } }: PickerProps) =>
  getQuickDays().map(({ key, label, meta, value }) => (
    <button
      key={key}
      onClick={() => actions.pickDay(value)}
      className={joinClassNames(
        controls.quickDay,
        state.query.date === value && controls.quickDaySelected,
      )}
    >
      <span className={styles.quickDayLabel}>{label}</span>
      <span className={styles.quickDayMeta}>{meta}</span>
    </button>
  ));

const MonthBar = ({
  search: { state, actions },
  className,
}: PickerProps & { className?: string }) => {
  const month = getVisibleMonth(state);

  return (
    <div className={className}>
      <button
        onClick={() => actions.prevMonth(month)}
        aria-label="Previous month"
        className={styles.monthNav}
      >
        <ChevronLeft size={20} strokeWidth={2} />
      </button>
      <div className={styles.monthLabel}>
        {month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
      </div>
      <button
        onClick={() => actions.nextMonth(month)}
        aria-label="Next month"
        className={styles.monthNav}
      >
        <ChevronRight size={20} strokeWidth={2} />
      </button>
    </div>
  );
};

const MonthGrid = ({ search: { state, actions } }: PickerProps) => (
  <>
    <div className={styles.dowRow}>
      {MONDAY_FIRST_WEEKDAYS.map((label) => (
        <div key={label} className={styles.dow}>
          {label}
        </div>
      ))}
    </div>
    <div className={styles.cells}>
      {getCalendarCells(getVisibleMonth(state)).map(
        ({ key, label, isDay, value, isPast }) => (
          <button
            key={key}
            onClick={() => {
              if (isDay) actions.pickDay(value);
            }}
            className={joinClassNames(
              controls.cell,
              isDay && controls.cellDay,
              !isDay && controls.cellBlank,
              isDay && isPast && controls.cellPast,
              state.query.date === value && controls.cellSelected,
            )}
          >
            {label}
          </button>
        ),
      )}
    </div>
  </>
);

const TimePills = ({ search: { state, actions } }: PickerProps) =>
  [...TIMES, { id: "custom", label: "Custom", meta: "" }].map(
    ({ id, label, meta }) => (
      <button
        key={id}
        onClick={() => actions.pickTime(id)}
        className={joinClassNames(
          controls.timePill,
          state.time === id && controls.timePillSelected,
        )}
      >
        <span className={styles.timeLabel}>{label}</span>
        <span className={controls.timeMeta}>{meta}</span>
      </button>
    ),
  );

const CustomTimes = ({
  search: { state, actions },
  className,
}: PickerProps & { className?: string }) => (
  <div className={className}>
    <select
      value={state.customFrom}
      onChange={actions.changeFrom}
      className={joinClassNames(pageGlobal.timesel, styles.timeSelect)}
    >
      {HOURS.map((hour) => (
        <option key={hour} value={hour}>
          {hour}
        </option>
      ))}
    </select>
    <span className={styles.to}>to</span>
    <select
      value={state.customTo}
      onChange={actions.changeTo}
      className={joinClassNames(pageGlobal.timesel, styles.timeSelect)}
    >
      {HOURS.map((hour) => (
        <option key={hour} value={hour}>
          {hour}
        </option>
      ))}
    </select>
  </div>
);

/** Desktop When popover: quick days + month calendar, time of day, custom range. */
export const DatePopover = ({ search }: PickerProps) => (
  <div className={styles.overlay}>
    <div
      onClick={search.actions.closeDate}
      className={styles.overlayScrim}
    ></div>
    <div className={styles.popover}>
      <div className={joinClassNames(pageGlobal.calgrid, styles.calgrid)}>
        <div className={styles.quickDaysColumn}>
          <QuickDays search={search} />
        </div>
        <div>
          <MonthBar search={search} className={styles.monthBar} />
          <MonthGrid search={search} />
        </div>
      </div>
      <div className={styles.timeRow}>
        <div className={styles.timeLabel}>Select time</div>
        <TimePills search={search} />
      </div>
      {search.state.time === "custom" && (
        <CustomTimes search={search} className={styles.customRow} />
      )}
    </div>
  </div>
);

/** Mobile sheet "Date & time" step. */
export const DatePickerMobile = ({ search }: PickerProps) => (
  <>
    <div className={styles.quickDaysGrid}>
      <QuickDays search={search} />
    </div>
    <MonthBar search={search} className={styles.monthBarMobile} />
    <MonthGrid search={search} />
    <div className={styles.timeRowMobile}>
      <div className={styles.timeLabelMobile}>Select time</div>
      <TimePills search={search} />
      {search.state.time === "custom" && (
        <CustomTimes search={search} className={styles.customRowMobile} />
      )}
    </div>
  </>
);
