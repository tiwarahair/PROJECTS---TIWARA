// Studio → Bookings values: the calendar / list block, the timeline block, past groups and filters.
import type { MouseEvent, TouchEvent } from "react";
import { PAST_MONTHS, PAST_TONE } from "./studio-data";
import { getDecoratedBookings } from "./studio-decorate";
import type { DecoratedBooking } from "./studio-decorate";
import {
  dateAt,
  dayInfo,
  durationToMinutes,
  getAvatarSrc,
  getMiniCalendarDays,
  hexWithAlpha,
  hhmm,
  timeRange,
  timeToMinutes,
} from "./studio-format";
import {
  getBlockColour,
  getBlockRange,
  getBookingBuffer,
  getClient,
  getExtraByName,
  getPastKey,
  getPastRows,
  getServiceDuration,
  getTileTone,
  getWorkingHours,
  isBlockOn,
  isPastIn,
} from "./studio-model";
import type { PastRecord, StudioState } from "./studio-types";
import type { StudioController } from "./use-studio";
import { LONG_MONTHS } from "../../utils/dates";

const DAY_PX = 128;
const WEEK_PX = 88;
const END_HOUR = 24;

type EmptyKind = "new" | "filtered" | "past" | "upcoming";

interface EmptyCopy {
  title: string;
  body: string;
}

const EMPTY_COPY: Record<EmptyKind, EmptyCopy> = {
  new: {
    title: "No appointments yet",
    body: "Share your booking link to get your first one.",
  },
  filtered: {
    title: "Nothing matches",
    body: "Try a wider date range or clear the filters.",
  },
  past: {
    title: "No past appointments",
    body: "Completed appointments will appear here once the date has passed.",
  },
  upcoming: {
    title: "Nothing booked yet",
    body: "Add a booking yourself or leave your days open for online bookings.",
  },
};

const DAY_NAMES: Record<number, string> = { 0: "Today", 1: "Tomorrow" };

/** Whether a booking `off` days away falls in a "When" filter option. */
const isInRangeOption = (id: string, dayOffset: number) => {
  if (id === "today") return dayOffset === 0;

  if (id === "7") return dayOffset < 7;

  if (id === "30") return dayOffset < 30;

  return true;
};

const isPayOption = (id: string, paid: string) => {
  if (id === "any") return true;

  if (id === "unpaid") return paid === "none" || paid === "link";

  return paid === "full";
};

const getTravelNote = (extra: number, travel: number) => {
  if (extra && travel) return ` (${travel}m travel)`;

  if (travel) return " travel";

  return "";
};

const getDotColour = (hasBooking: boolean, isSelected: boolean) => {
  if (!hasBooking) return "transparent";

  return isSelected ? "var(--brand-yellow)" : "var(--accent-700)";
};

const getTimeToPixels = (pixelsPerHour: number) => (minutes: number) =>
  (minutes / 60) * pixelsPerHour;

const clampMinutes = (minutes: number) =>
  Math.min(Math.max(minutes, 0), END_HOUR * 60);

const getOffBands = (
  state: StudioState,
  offset: number,
  getTop: (minutes: number) => number,
) => {
  const hours = getWorkingHours(state, offset);

  const band = (from: number, to: number) => {
    const top = getTop(clampMinutes(from));
    const height = getTop(clampMinutes(to)) - top;

    return height > 1
      ? { top: `${top.toFixed(0)}px`, height: `${height.toFixed(0)}px` }
      : null;
  };

  const bands = hours.on
    ? [
        band(0, timeToMinutes(hours.start)),
        band(timeToMinutes(hours.end), END_HOUR * 60),
      ]
    : [band(0, END_HOUR * 60)];

  return bands.filter((item) => item !== null);
};

/** A booking's tile colours as custom properties (runtime: from its service category and status). */
export const getBlockTone = (booking: DecoratedBooking) => ({
  "--bk-bg": booking.tileBackground,
  "--bk-bar": booking.tileBar,
  "--bk-line": booking.tileLine,
  "--bk-dash": booking.tileBorder,
  "--bk-text": booking.tileText,
  "--bk-meta": booking.tileMeta,
  "--badge-bg": booking.badgeBackground,
  "--badge-border": booking.badgeBorder,
  "--badge-color": booking.badgeColor,
});

export const getBookingsView = (studio: StudioController) => {
  const { state, setState, isWide, isNew, actions, seedPast } = studio;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const upcoming = getDecoratedBookings(state, isNew, (booking) =>
    actions.openSheet("booking", { sheetBookingId: booking.id }),
  );

  const dayBookings = upcoming.filter(
    ({ dayOffset }) => dayOffset === state.dayIndex,
  );

  const isList = state.bookingsLayout === "list";
  const scope = state.listScope || "upcoming";
  const isPast = isList && scope === "past";
  const isUpcoming = isList && !isPast;
  const day = dayInfo(state.dayIndex);

  const mondayOffset =
    state.dayIndex - ((dateAt(state.dayIndex).getDay() + 6) % 7);

  const query = (state.bookingsQuery || "").trim().toLowerCase();

  const matchesQuery = (name: string, service: string) =>
    !query ||
    name.toLowerCase().includes(query) ||
    service.toLowerCase().includes(query);

  const isInRange = (booking: DecoratedBooking) =>
    isInRangeOption(state.filterRange, booking.dayOffset);

  const isStatus = (booking: DecoratedBooking) =>
    state.filterStatus === "all" || booking.status === state.filterStatus;

  const isPay = (booking: DecoratedBooking) =>
    isPayOption(state.filterPayment, booking.paid);

  const upcomingBase = upcoming.filter((booking) =>
    matchesQuery(booking.clientName, booking.service),
  );

  const upcomingItems = upcomingBase.filter(
    (booking) => isInRange(booking) && isStatus(booking) && isPay(booking),
  );

  const pastFilter = state.pastFilter || "all";

  const pastBase = getPastRows(state, isNew, seedPast).filter((row) =>
    matchesQuery(getClient(state, row.client).name, row.service),
  );

  const pastItems = pastBase.filter((row) => isPastIn(row, pastFilter));

  const dayGroups: { dayOffset: number; items: DecoratedBooking[] }[] = [];

  upcomingItems.forEach((booking) => {
    let group = dayGroups.find(
      ({ dayOffset }) => dayOffset === booking.dayOffset,
    );

    if (!group) {
      group = { dayOffset: booking.dayOffset, items: [] };
      dayGroups.push(group);
    }

    group.items.push(booking);
  });

  const getTotal = (items: { price: number }[]) => {
    let total = 0;

    for (const { price } of items) total += price;

    return total;
  };

  const upcomingGroups = dayGroups.map(({ dayOffset, items }, index) => {
    const countLabel =
      items.length + (items.length === 1 ? " booking" : " bookings");

    return {
      key: String(dayOffset),
      isLast: index === dayGroups.length - 1,
      label: DAY_NAMES[dayOffset] ?? dayInfo(dayOffset).label,
      isToday: dayOffset === 0,
      meta: `${countLabel} · £${getTotal(items)}`,
      items,
    };
  });

  const upcomingCount = upcomingItems.length;
  const pastCount = pastItems.length;

  const filterCount = isPast
    ? Number(pastFilter !== "all")
    : Number(state.filterRange !== "all") +
      Number(state.filterStatus !== "all") +
      Number(state.filterPayment !== "any");

  const RANGE = [
    { id: "all", label: "All upcoming" },
    { id: "today", label: "Today" },
    { id: "7", label: "Next 7 days" },
    { id: "30", label: "Next 30 days" },
  ];

  const STATUS = [
    { id: "all", label: "Any status" },
    { id: "awaiting", label: "Awaiting confirmation" },
    { id: "confirmed", label: "Confirmed" },
    { id: "arrived", label: "Arrived" },
  ];

  const PAY = [
    { id: "any", label: "Any payment" },
    { id: "unpaid", label: "Deposit unpaid" },
    { id: "full", label: "Paid in full" },
  ];

  const PAST_STATUS = [
    { id: "all", label: "All" },
    { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
    { id: "noshow", label: "No show" },
    { id: "failed", label: "Payment failed" },
  ];

  const getLabel = (list: { id: string; label: string }[], id: string) =>
    list.find((option) => option.id === id)?.label || "";

  const filterChips: { label: string; clear: () => void }[] = [];

  if (isUpcoming) {
    if (state.filterRange !== "all")
      filterChips.push({
        label: getLabel(RANGE, state.filterRange),
        clear: () => setState({ filterRange: "all" }),
      });

    if (state.filterStatus !== "all")
      filterChips.push({
        label: getLabel(STATUS, state.filterStatus),
        clear: () => setState({ filterStatus: "all" }),
      });

    if (state.filterPayment !== "any")
      filterChips.push({
        label: getLabel(PAY, state.filterPayment),
        clear: () => setState({ filterPayment: "any" }),
      });
  } else if (pastFilter !== "all")
    filterChips.push({
      label: getLabel(PAST_STATUS, pastFilter),
      clear: () => setState({ pastFilter: "all" }),
    });

  const closeFilter = () => {
    setState({ filterOut: true });
    window.clearTimeout(studio.context.timers.filter);

    studio.context.timers.filter = window.setTimeout(
      () => setState({ filterOpen: false, filterOut: false }),
      210,
    );
  };

  const toChip = (
    option: { id: string; label: string },
    isOn: boolean,
    pick: () => void,
    count: number,
  ) => ({
    key: option.id,
    label: option.label,
    count: String(count),
    isOn,
    pick,
  });

  const isRangeOption = (id: string, booking: DecoratedBooking) =>
    isInRangeOption(id, booking.dayOffset);

  const filterSections = isPast
    ? [
        {
          label: "Status",
          options: PAST_STATUS.map((option) =>
            toChip(
              option,
              pastFilter === option.id,
              () => setState({ pastFilter: option.id }),
              pastBase.filter((row) => isPastIn(row, option.id)).length,
            ),
          ),
        },
      ]
    : [
        {
          label: "When",
          options: RANGE.map((option) =>
            toChip(
              option,
              state.filterRange === option.id,
              () => setState({ filterRange: option.id }),
              upcomingBase.filter(
                (booking) =>
                  isStatus(booking) &&
                  isPay(booking) &&
                  isRangeOption(option.id, booking),
              ).length,
            ),
          ),
        },
        {
          label: "Status",
          options: STATUS.map((option) =>
            toChip(
              option,
              state.filterStatus === option.id,
              () => setState({ filterStatus: option.id }),
              upcomingBase.filter(
                (booking) =>
                  isInRange(booking) &&
                  isPay(booking) &&
                  (option.id === "all" || booking.status === option.id),
              ).length,
            ),
          ),
        },
        {
          label: "Payment",
          options: PAY.map((option) =>
            toChip(
              option,
              state.filterPayment === option.id,
              () => setState({ filterPayment: option.id }),
              upcomingBase.filter(
                (booking) =>
                  isInRange(booking) &&
                  isStatus(booking) &&
                  isPayOption(option.id, booking.paid),
              ).length,
            ),
          ),
        },
      ];

  const shownCount = isPast ? pastCount : upcomingCount;
  let earned = 0;

  for (const row of pastItems)
    if (row.status === "Completed") earned += row.price;

  // ---- the day / week timeline ----
  const getDayTop = getTimeToPixels(DAY_PX);
  const getWeekTop = getTimeToPixels(WEEK_PX);

  const getBlocked = (
    offset: number,
    getTop: (minutes: number) => number,
    minHeight: number,
  ) =>
    state.blocked
      .filter((block) => isBlockOn(block, offset))
      .map((block) => {
        const [from, to] = getBlockRange(state, block, offset);
        const top = getTop(clampMinutes(from));
        const height = getTop(clampMinutes(to)) - top;
        const colour = getBlockColour();
        const foreground = colour.foreground || colour.hex;

        return {
          key: block.id,
          top: `${(top + 1).toFixed(0)}px`,
          height: `${Math.max(minHeight, height - 3).toFixed(0)}px`,
          hex: foreground,
          line: hexWithAlpha(colour.hex, 0.45),
          background: hexWithAlpha(colour.hex, 0.16),
          label:
            (block.reason || "Blocked").replace(/( · )?Repeats.*$/, "") +
            (block.span === "All day" ? " · All day" : ""),
          open: (event: MouseEvent) => {
            event.stopPropagation();
            actions.blockPop(block, event);
          },
        };
      });

  const hours = getWorkingHours(state, state.dayIndex || 0);

  const hourLines: {
    key: number;
    label: string;
    paddedHour: string;
    top: string;
    isWorking: boolean;
  }[] = [];

  for (let hour = 0; hour <= END_HOUR; hour++)
    hourLines.push({
      key: hour,
      label: hour === 24 ? "" : `${(hour < 10 ? "0" : "") + hour}:00`,
      paddedHour: (hour < 10 ? "0" : "") + hour,
      top: `${getDayTop(hour * 60).toFixed(0)}px`,
      isWorking:
        hours.on &&
        hour * 60 >= timeToMinutes(hours.start) &&
        hour * 60 <= timeToMinutes(hours.end),
    });

  const quarters: string[] = [];

  for (let minutes = 15; minutes < END_HOUR * 60; minutes += 15)
    if (minutes % 60) quarters.push(`${getDayTop(minutes).toFixed(0)}px`);

  const dayBlocks = dayBookings.map((booking) => ({
    booking,
    top: `${getDayTop(timeToMinutes(booking.time)).toFixed(0)}px`,
    height: `${Math.max(40, (durationToMinutes(booking.duration) / 60) * DAY_PX - 3).toFixed(0)}px`,
  }));

  const stubs = dayBookings
    .map((booking) => {
      const buffer = getBookingBuffer(state, booking.service);

      if (!buffer) return null;

      const end =
        timeToMinutes(booking.time) + durationToMinutes(booking.duration);

      const extra = getExtraByName(state, booking.service);
      const travel = buffer - extra;
      const tone = getTileTone(state, booking.service);

      return {
        key: booking.id,
        top: `${(getDayTop(end) - 1).toFixed(0)}px`,
        height: `${Math.max(15, (buffer / 60) * DAY_PX - 1).toFixed(0)}px`,
        background: tone.background,
        foreground: tone.meta,
        dash: tone.hatch,
        label: `+${buffer}m${getTravelNote(extra, travel)}`,
      };
    })
    .filter((item) => item !== null);

  const nowLine =
    state.dayIndex === 0 && nowMinutes > 0 && nowMinutes < END_HOUR * 60
      ? {
          top: `${getDayTop(nowMinutes).toFixed(0)}px`,
          label: hhmm(nowMinutes),
        }
      : null;

  const isWeek = state.calendarMode === "week";

  const weekMonday = (() => {
    const offset = state.dayIndex || 0;

    return offset - ((dateAt(offset).getDay() + 6) % 7);
  })();

  const weekCols = isWeek
    ? Array.from({ length: 7 }, (_slot, index) => {
        const offset = weekMonday + index;
        const info = dayInfo(offset);
        const isToday = offset === 0;
        const isSelected = offset === (state.dayIndex || 0);

        return {
          key: offset,
          weekday: info.weekday,
          dayNumber: info.dayNumber,
          isToday,
          isSelected,
          offBands: getOffBands(state, offset, getWeekTop),
          blocked: getBlocked(offset, getWeekTop, 18),
          blocks: upcoming
            .filter(({ dayOffset }) => dayOffset === offset)
            .map((booking) => {
              const blockHeight = Math.max(
                30,
                (durationToMinutes(booking.duration) / 60) * WEEK_PX - 3,
              ).toFixed(0);

              return {
                booking,
                top: `${getWeekTop(timeToMinutes(booking.time)).toFixed(0)}px`,
                height: `${blockHeight}px`,
              };
            }),
          nowTop:
            isToday && nowMinutes > 0 && nowMinutes < END_HOUR * 60
              ? `${getWeekTop(nowMinutes).toFixed(0)}px`
              : null,
          pickDay: () => actions.setCalendar({ dayIndex: offset }),
          tap: (event: MouseEvent<HTMLElement>) => {
            const rect = event.currentTarget.getBoundingClientRect();

            const quarter = Math.floor(
              (event.clientY - rect.top) / (WEEK_PX / 4),
            );

            const minutes = Math.min(23 * 60 + 45, Math.max(0, quarter * 15));
            const dayHours = getWorkingHours(state, offset);

            const isOutside =
              !dayHours.on ||
              minutes < timeToMinutes(dayHours.start) ||
              minutes >= timeToMinutes(dayHours.end);

            const width = 236;
            const height = 132;
            const pad = 12;

            setState({
              dayIndex: offset,
              pop: {
                time: hhmm(minutes),
                warn: isOutside,
                x: Math.min(
                  Math.max(pad, event.clientX + 6),
                  window.innerWidth - width - pad,
                ),
                y: Math.min(
                  Math.max(pad, event.clientY + 6),
                  window.innerHeight - height - pad,
                ),
              },
            });
          },
        };
      })
    : [];

  if (isWeek) {
    // where the week view scrolls to: an hour before now, else just above the first booking
    const hasToday = weekMonday <= 0 && weekMonday + 6 >= 0;

    const firsts = weekCols.flatMap(({ blocks }) =>
      blocks.map(({ top }) => parseFloat(top)),
    );

    const getTarget = () => {
      if (hasToday) return getWeekTop(Math.max(0, nowMinutes - 60));

      if (firsts.length) return Math.min(...firsts) - 24;

      return getWeekTop(8 * 60);
    };

    const target = getTarget();

    studio.context.memo.weekScrollTarget = Math.max(0, target);
    studio.context.memo.weekKey = weekMonday;
  }

  const weekHours: { key: number; label: string; top: string }[] = [];

  for (let hour = 0; hour <= END_HOUR; hour++)
    weekHours.push({
      key: hour,
      label: hour === 24 ? "" : `${(hour < 10 ? "0" : "") + hour}:00`,
      top: `${getWeekTop(hour * 60).toFixed(0)}px`,
    });

  const quickTime = state.quickAdd?.time ?? null;
  const quickMinutes = quickTime ? timeToMinutes(quickTime) : null;

  const isQuickOutside =
    quickMinutes != null &&
    (!hours.on ||
      quickMinutes < timeToMinutes(hours.start) ||
      quickMinutes >= timeToMinutes(hours.end));

  // ---- the date picker ----
  const pickerMonth =
    state.bookingCalendarMonth == null
      ? now.getMonth()
      : state.bookingCalendarMonth;

  const pickerYear =
    state.bookingCalendarYear == null
      ? now.getFullYear()
      : state.bookingCalendarYear;

  const hasBookings = new Set(upcoming.map(({ dayOffset }) => dayOffset));

  const isPrevOff =
    state.bookingCalendarYear == null ||
    state.bookingCalendarYear < now.getFullYear() ||
    (state.bookingCalendarYear === now.getFullYear() &&
      (state.bookingCalendarMonth ?? 0) <= now.getMonth());

  const pickerDays = getMiniCalendarDays(
    pickerMonth,
    pickerYear,
    state.dayIndex,
    (offset) => actions.setDay({ dayIndex: offset, datePickerOpen: false }),
    -3650,
    (offset, isSelected) => getDotColour(hasBookings.has(offset), isSelected),
  );

  // ---- past list ----
  const pastGroups: {
    month: string;
    items: ReturnType<typeof getPastItem>[];
  }[] = [];

  const getPastItem = (row: PastRecord, index: number) => {
    const client = getClient(state, row.client);

    const tone = PAST_TONE[row.status] ?? {
      background: "var(--quiet)",
      color: "var(--text-secondary)",
      meta: "",
    };

    const isCompleted = row.status === "Completed";
    const isFresh = !!row.at && Date.now() - row.at < 86400000;
    const duration = row.duration || getServiceDuration(state, row.service);
    const end = timeToMinutes(row.time) + durationToMinutes(duration);
    const feeMeta = isFresh ? "Fee pending" : `${row.feeLabel} fee kept`;
    const settledMeta = row.meta || (isCompleted ? "Paid" : tone.meta);
    const endHours = String(Math.floor(end / 60) % 24).padStart(2, "0");
    const endMinutes = String(end % 60).padStart(2, "0");

    return {
      key: String(getPastKey(row)),
      clientName: client.name,
      imgSrc: getAvatarSrc(client),
      isFaded: !isCompleted,
      service: row.service,
      when: row.when,
      time: timeRange(row.time, duration),
      start: row.time,
      endTime: `–${endHours}:${endMinutes}`,
      stripe: getTileTone(state, row.service).bar,
      status: row.status,
      badgeBackground: tone.background,
      badgeColor: tone.color,
      open: () =>
        actions.openSheet("past", { selectedPastId: getPastKey(row) }),
      priceLabel: `£${row.price}`,
      isStruck: !isCompleted,
      priceMeta: row.feePending && !row.waived ? feeMeta : settledMeta,
      delay: `${(index * 0.04).toFixed(2)}s`,
    };
  };

  getPastRows(state, isNew, seedPast)
    .filter((row) => isPastIn(row, pastFilter))
    .filter(
      (row) =>
        !query ||
        getClient(state, row.client).name.toLowerCase().includes(query) ||
        row.service.toLowerCase().includes(query),
    )
    .forEach((row, index) => {
      const month = PAST_MONTHS[row.when.split(" ")[2] ?? ""] || "Earlier";
      let group = pastGroups.find((item) => item.month === month);

      if (!group) {
        group = { month, items: [] };
        pastGroups.push(group);
      }

      group.items.push(getPastItem(row, index));
    });

  const getListSummary = () => {
    if (!isPast)
      return (
        upcomingCount +
        (upcomingCount === 1 ? " booking" : " bookings") +
        (state.filterRange === "all" ? " upcoming" : "")
      );

    const pastLabel =
      pastCount + (pastCount === 1 ? " appointment" : " appointments");

    if (pastFilter === "off") return `${pastLabel} did not go ahead`;

    const completedCount = pastItems.filter(
      ({ status }) => status === "Completed",
    ).length;

    return `${pastLabel} · ${completedCount} completed`;
  };

  const getEmptyKind = (): EmptyKind => {
    if (isNew) return "new";

    if (filterCount > 0 || query) return "filtered";

    if (isPast) return "past";

    return "upcoming";
  };

  const emptyCopy = EMPTY_COPY[getEmptyKind()];

  const outsideHint = hours.on
    ? `Outside your hours (${hours.start}–${hours.end}). You can still book it.`
    : "You’re closed this day. You can still book it.";

  const dayPrefix = DAY_NAMES[state.dayIndex]
    ? `${DAY_NAMES[state.dayIndex]}, `
    : "";

  return {
    upcoming,
    isList,
    isCalendar: !isList,
    isUpcoming,
    isPast,
    calendarDateLabel: `${dayPrefix}${day.weekday} ${day.dayNumber} ${day.monthName}`,
    weekStrip: Array.from({ length: 7 }, (_slot, index) => {
      const offset = mondayOffset + index;
      const info = dayInfo(offset);

      const count = upcoming.filter(
        ({ dayOffset }) => dayOffset === offset,
      ).length;

      const isSelected = offset === state.dayIndex;

      return {
        key: offset,
        weekday: info.weekday,
        dayNumber: info.dayNumber,
        isSelected,
        isToday: offset === 0,
        isPast: offset < 0,
        dot: getDotColour(count > 0, isSelected),
        pick: () => actions.setDay({ dayIndex: offset }),
      };
    }),
    filterCount: filterCount ? String(filterCount) : "",
    isFilterActive: filterCount > 0 || !!query,
    filterChips,
    clearFilter: () =>
      setState({
        filterRange: "all",
        filterStatus: "all",
        filterPayment: "any",
        pastFilter: "all",
        bookingsQuery: "",
      }),
    closeFilter,
    filterSections,
    filterCta: `Show ${shownCount}${shownCount === 1 ? " booking" : " bookings"}`,
    upcomingGroups,
    listSummary: getListSummary(),
    listTotal: isPast
      ? `£${earned} earned`
      : `£${getTotal(upcomingItems)} booked`,
    isListEmpty: isPast ? pastCount === 0 : upcomingCount === 0,
    listEmptyTitle: emptyCopy.title,
    listEmptyBody: emptyCopy.body,
    pastGroups,
    // timeline
    hourLines,
    quarters,
    dayBlocks,
    stubs,
    nowLine,
    dayOffBands: getOffBands(state, state.dayIndex || 0, getDayTop),
    dayBlocked: getBlocked(state.dayIndex || 0, getDayTop, 22),
    dayHeight: `${END_HOUR * DAY_PX + 14}px`,
    isWeek,
    weekCols,
    weekHours,
    weekHeight: `${END_HOUR * WEEK_PX + 14}px`,
    quickHint: isQuickOutside ? outsideHint : "What would you like to do here?",
    isQuickOutside,
    // date picker
    pickerTitle: `${LONG_MONTHS[pickerMonth]} ${pickerYear}`,
    pickerDays,
    isPrevOff,
    swipeStart: (event: TouchEvent) => {
      const touch = event.touches?.[0];

      if (touch)
        studio.context.memo.swipe = { x: touch.clientX, y: touch.clientY };
    },
    swipeEnd: (event: TouchEvent) => {
      const start = studio.context.memo.swipe;

      studio.context.memo.swipe = null;
      const touch = event.changedTouches?.[0];

      if (!start || !touch) return;

      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;

      if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY) * 1.3)
        return;

      actions.slideDay(deltaX < 0 ? 1 : -1);
    },
    onTimelineTap: (event: MouseEvent<HTMLElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();

      const quarter = Math.floor(
        (event.clientY - rect.top) / (rect.height / 96),
      );

      const minutes = Math.min(23 * 60 + 45, Math.max(0, quarter * 15));
      const dayHours = getWorkingHours(state, state.dayIndex);

      const isOutside =
        !dayHours.on ||
        minutes < timeToMinutes(dayHours.start) ||
        minutes >= timeToMinutes(dayHours.end);

      // anchor to the pointer, kept inside the viewport
      const width = 236;
      const height = 132;
      const pad = 12;

      const x = Math.min(
        Math.max(pad, event.clientX + 6),
        window.innerWidth - width - pad,
      );

      const y = Math.min(
        Math.max(pad, event.clientY + 6),
        window.innerHeight - height - pad,
      );

      if (!isWide) {
        setState({ quickAdd: { time: hhmm(minutes) }, quickAddOut: false });

        return;
      }

      setState({ pop: { time: hhmm(minutes), x, y, warn: isOutside } });
    },
  };
};

export type BookingsView = ReturnType<typeof getBookingsView>;
export { DAY_PX, WEEK_PX };
