import { joinClassNames } from "../../../../../utils/class-names";
import { hhmm } from "../../../core/format";
import type { StudioState } from "../../../core/types";
import styles from "../../../../../styles/features/studio/settings/availability/block-sheet/time-fields.module.css";
import fields from "../../../../../styles/features/studio/settings/availability/sheet-fields.module.css";

type BlockDraft = StudioState["blockDraft"];

export interface TimeFieldsProps {
  draft: BlockDraft;
  setDraft: (patch: Partial<BlockDraft>) => void;
  endError?: string;
}

const getTimeOptions = ({ start, end }: BlockDraft) => {
  const times: string[] = [];

  for (let minutes = 6 * 60; minutes <= 23 * 60 + 45; minutes += 15)
    times.push(hhmm(minutes));

  [start, end].forEach((time) => {
    if (time && !times.includes(time)) times.push(time);
  });

  return times.sort();
};

export const TimeFields = ({ draft, setDraft, endError }: TimeFieldsProps) => {
  const times = getTimeOptions(draft);

  const timeOptions = times.map((time) => (
    <option key={time} value={time}>
      {time}
    </option>
  ));

  return (
    <>
      <button
        className={styles.allDay}
        onClick={() => setDraft({ allDay: !draft.allDay })}
      >
        <span className={styles.grow}>
          <span className={styles.allDayLabel}>All day</span>
          <span className={styles.allDayHint}>
            {draft.allDay
              ? "No online bookings at all on this day"
              : "Block just part of the day"}
          </span>
        </span>
        <span
          className={joinClassNames(
            styles.toggle,
            draft.allDay && styles.toggleOn,
          )}
        >
          <span className={styles.knob}></span>
        </span>
      </button>
      {!draft.allDay && (
        <div className={styles.times}>
          <select
            className={styles.timeSelect}
            value={draft.start}
            onChange={(event) => setDraft({ start: event.target.value })}
          >
            {timeOptions}
          </select>
          <span className={styles.to}>to</span>
          <select
            className={styles.timeSelect}
            value={draft.end}
            onChange={(event) => setDraft({ end: event.target.value })}
          >
            {timeOptions}
          </select>
        </div>
      )}
      {!draft.allDay && endError && (
        <span className={fields.fieldError} role="alert">
          {endError}
        </span>
      )}
    </>
  );
};
