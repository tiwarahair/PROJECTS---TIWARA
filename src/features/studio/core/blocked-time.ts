// Blocked time and closed periods: the calendar works in day offsets from today, the database in ISO dates.
import type { TablesInsert } from "../../../types/database";
import { toIsoDate } from "../../../utils/dates";
import { dateAt, dayInfo } from "./format";
import type { BlockedTime } from "./types";

const FREQUENCY_LABELS: Record<string, string> = {
  none: "",
  daily: "Repeats daily",
  weekly: "Repeats weekly",
  monthly: "Repeats monthly",
};

/** Days from today ⇄ ISO dates (Studio's calendar works in offsets). */
export const toOffset = (isoDate: string) =>
  Math.round(
    (new Date(`${isoDate}T12:00:00`).getTime() -
      dateAt(0).setHours(12, 0, 0, 0)) /
      864e5,
  );

export const toDate = (offset: number) => toIsoDate(dateAt(offset));

export interface BlockFields {
  id: string;
  dayIndex: number;
  allDay: boolean;
  start: string;
  end: string;
  note: string;
  frequency: string;
  ends: string;
  endDayOffset?: number | null;
  color: string;
}

/** The calendar's blocked-time item, with its display labels. */
export const buildBlockedTime = (fields: BlockFields): BlockedTime => {
  const info = dayInfo(fields.dayIndex);
  let frequencyLabel = FREQUENCY_LABELS[fields.frequency] ?? "";

  if (frequencyLabel && fields.ends === "date" && fields.endDayOffset != null) {
    const end = dayInfo(fields.endDayOffset);

    frequencyLabel += ` until ${end.dayNumber} ${end.monthName}`;
  }

  return {
    id: fields.id,
    day: `${info.weekday} ${info.dayNumber} ${info.monthName}`,
    dayIndex: fields.dayIndex,
    span: fields.allDay ? "All day" : `${fields.start} to ${fields.end}`,
    frequency: fields.frequency,
    ends: fields.ends,
    endDayOffset: fields.endDayOffset,
    color: fields.color,
    note: fields.note,
    reason: [fields.note, frequencyLabel].filter(Boolean).join(" · "),
  };
};

export const formatClosedSpan = (from: string, to: string) => {
  const format = (value: string) => {
    const info = dayInfo(toOffset(value));

    return `${info.dayNumber} ${info.monthName}`;
  };

  return `${format(from)} to ${format(to)}`;
};

export const fromBlockedTime = (
  block: BlockedTime,
  stylistId: string,
): TablesInsert<"time_blocks"> => {
  const isAllDay = block.span === "All day";
  const [start, end] = isAllDay ? [null, null] : block.span.split(" to ");

  return {
    id: block.id,
    stylist_id: stylistId,
    starts_on: toDate(block.dayIndex),
    all_day: isAllDay,
    start_time: start,
    end_time: end,
    repeat: block.frequency ?? "none",
    repeat_until:
      block.ends === "date" && block.endDayOffset != null
        ? toDate(block.endDayOffset)
        : null,
    reason: block.note ?? "",
    colour: block.color ?? "purple",
  };
};
