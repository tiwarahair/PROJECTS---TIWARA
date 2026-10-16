import type { ChangeEvent } from "react";
import { SLOT_TIMES } from "../../core/constants";
import { dayInfo, getMiniCalendarDays, timeRange } from "../../core/format";
import { getWorkingHours } from "../../core/model";
import { LONG_MONTHS, formatDuration } from "../../../../utils/dates";
import { getTimeHints } from "../time-hints";
import type { AddContext } from "./context";

const getSummary = ({
  state,
  client,
  service,
  duration,
  priceLabel,
}: AddContext) => {
  if (!client || !service || state.addDay == null || !state.addTime)
    return "Pick a day and time to see the summary.";

  const { label: dayLabel } = dayInfo(state.addDay);
  const slotRange = timeRange(state.addTime, formatDuration(duration));

  return `${client.name} · ${service.name} · ${dayLabel}, ${slotRange} · £${priceLabel}`;
};

// ---- step 3: when ----
export const getWhenView = (context: AddContext) => {
  const { state, setState, now, slots, conflicts } = context;
  const { addDay, addTime } = state;
  const hours = getWorkingHours(state, addDay || 0);
  const customTime = addTime || "";
  const calendarMonth = state.calendarMonth ?? now.getMonth();
  const calendarYear = state.calendarYear ?? now.getFullYear();

  const isCustom =
    !!state.addCustom ||
    (state.addStep === 3 && !!addTime && !slots.includes(addTime));

  const pickDay = (offset: number) =>
    setState({ addDay: offset, addOverlapAllowed: false });

  const conflictList = conflicts
    .map(({ name, range }) => `${name}, ${range}`)
    .join(" · ");

  return {
    isCalendarOpen: state.calendarOpen,
    toggleCalendar: () =>
      setState({
        calendarOpen: !state.calendarOpen,
        calendarMonth,
        calendarYear,
      }),
    calendarTitle: `${LONG_MONTHS[calendarMonth]} ${calendarYear}`,
    calendarDays: getMiniCalendarDays(
      calendarMonth,
      calendarYear,
      addDay,
      pickDay,
      0,
    ),
    days: Array.from({ length: 8 }, (_slot, offset) => {
      const { weekday, dayNumber } = dayInfo(offset);

      return {
        key: offset,
        weekday,
        dayNumber,
        isOn: addDay === offset,
        pick: () => pickDay(offset),
      };
    }),
    times: slots.map((time) => ({
      key: time,
      label: time,
      isOn: addTime === time,
      pick: () =>
        setState({ addTime: time, addCustom: false, addOverlapAllowed: false }),
    })),
    isNoSlots: addDay != null && slots.length === 0,
    ...getTimeHints(hours, isCustom, customTime),
    isCustom,
    toggleCustom: () =>
      setState({
        addCustom: !isCustom,
        addTime:
          isCustom || SLOT_TIMES.includes(addTime ?? "") ? null : addTime,
      }),
    customTime,
    onCustomTime: (event: ChangeEvent<HTMLInputElement>) =>
      setState({
        addTime: event.target.value || null,
        addOverlapAllowed: false,
      }),
    customMinutes: hours.on ? hours.start : "00:00",
    customMax: hours.on ? hours.end : "23:59",
    hasConflict: conflicts.length > 0,
    conflictBody: `${conflictList}. Tick below if you want to double up.`,
    isOverlapAllowed: state.addOverlapAllowed,
    toggleOverlap: () =>
      setState({ addOverlapAllowed: !state.addOverlapAllowed }),
    summary: getSummary(context),
  };
};
