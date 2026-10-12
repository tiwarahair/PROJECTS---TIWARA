import { joinClassNames } from "../../utils/class-names";
import controls from "../../styles/features/search/search-controls.module.css";
import {
  WEEKDAY_LABELS,
  getCalendarCells,
  getQuickDays,
  getVisibleMonth,
  HOURS,
  TIMES,
} from "./search-dates";
import helmet from "../../styles/features/search/search-helmet.module.css";
import styles from "../../styles/features/search/date-picker.module.css";
import type { SearchController } from "./use-search";

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
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="m15 18-6-6 6-6"></path>
        </svg>
      </button>
      <div className={styles.monthLabel}>
        {month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
      </div>
      <button
        onClick={() => actions.nextMonth(month)}
        aria-label="Next month"
        className={styles.monthNav}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="m9 18 6-6-6-6"></path>
        </svg>
      </button>
    </div>
  );
};

const MonthGrid = ({ search: { state, actions } }: PickerProps) => (
  <>
    <div className={styles.dowRow}>
      {WEEKDAY_LABELS.map((label) => (
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
      className={joinClassNames(helmet.timesel, styles.timeSelect)}
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
      className={joinClassNames(helmet.timesel, styles.timeSelect)}
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
      <div className={joinClassNames(helmet.calgrid, styles.calgrid)}>
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
