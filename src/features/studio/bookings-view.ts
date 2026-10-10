// Studio → Bookings values (prototype renderVals: the calendar / list block, the timeline block, pastGroups, filters).
import type { MouseEvent, TouchEvent } from "react";
import { MONTHS_LONG, PAST_MONTHS, PAST_TONE } from "./studio-data";
import { getDecoratedBookings } from "./studio-decorate";
import type { DecoratedBooking } from "./studio-decorate";
import {
  dateAt,
  dayInfo,
  durToMin,
  getAvatarSrc,
  getMiniCalDays,
  hexA,
  hhmm,
  timeRange,
  toMin,
} from "./studio-format";
import {
  getBlockColour,
  getBlockRange,
  getBookingBuffer,
  getClient,
  getExtraByName,
  getPastKey,
  getPastRows,
  getServiceDur,
  getTileTone,
  getWorkingHours,
  isBlockOn,
  isPastIn,
} from "./studio-model";
import type { PastRecord, StudioState } from "./studio-types";
import type { StudioController } from "./use-studio";

const DAY_PX = 128;
const WEEK_PX = 88;
const END_HOUR = 24;

const getY = (pixelsPerHour: number) => (minutes: number) =>
  (minutes / 60) * pixelsPerHour;
const clampMinutes = (minutes: number) =>
  Math.min(Math.max(minutes, 0), END_HOUR * 60);

const getOffBands = (
  state: StudioState,
  offset: number,
  y: (minutes: number) => number,
) => {
  const hours = getWorkingHours(state, offset);
  const band = (from: number, to: number) => {
    const top = y(clampMinutes(from));
    const height = y(clampMinutes(to)) - top;
    return height > 1
      ? { top: top.toFixed(0) + "px", h: height.toFixed(0) + "px" }
      : null;
  };
  const bands = hours.on
    ? [band(0, toMin(hours.s)), band(toMin(hours.e), END_HOUR * 60)]
    : [band(0, END_HOUR * 60)];
  return bands.filter((item) => item !== null);
};

/** A booking's tile colours as custom properties (runtime: from its service category and status). */
export const getBlockTone = (booking: DecoratedBooking) => ({
  "--bk-bg": booking.tileBg,
  "--bk-bar": booking.tileBar,
  "--bk-line": booking.tileLine,
  "--bk-dash": booking.tileBorder,
  "--bk-text": booking.tileText,
  "--bk-meta": booking.tileMeta,
  "--badge-bg": booking.badgeBg,
  "--badge-border": booking.badgeBorder,
  "--badge-color": booking.badgeColor,
});

export const getBookingsView = (studio: StudioController) => {
  const { state, setState, isWide, isNew, actions, seedPast } = studio;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const upcoming = getDecoratedBookings(state, isNew, (booking) =>
    actions.openSheet("booking", { sheetBId: booking.id }),
  );
  const dayBookings = upcoming.filter(({ off }) => off === state.dayIdx);
  const isList = state.bview === "list";
  const scope = state.listScope || "upcoming";
  const isPast = isList && scope === "past";
  const isUpcoming = isList && !isPast;
  const day = dayInfo(state.dayIdx);
  const mondayOffset = state.dayIdx - ((dateAt(state.dayIdx).getDay() + 6) % 7);
  const query = (state.bkQ || "").trim().toLowerCase();
  const matchesQuery = (name: string, service: string) =>
    !query ||
    name.toLowerCase().includes(query) ||
    service.toLowerCase().includes(query);
  const isInRange = (booking: DecoratedBooking) =>
    state.fRange === "today"
      ? booking.off === 0
      : state.fRange === "7"
        ? booking.off < 7
        : state.fRange === "30"
          ? booking.off < 30
          : true;
  const isStatus = (booking: DecoratedBooking) =>
    state.fStatus === "all" || booking.st === state.fStatus;
  const isPay = (booking: DecoratedBooking) =>
    state.fPay === "any"
      ? true
      : state.fPay === "unpaid"
        ? booking.paid === "none" || booking.paid === "link"
        : booking.paid === "full";
  const upBase = upcoming.filter((booking) =>
    matchesQuery(booking.clientName, booking.svc),
  );
  const upItems = upBase.filter(
    (booking) => isInRange(booking) && isStatus(booking) && isPay(booking),
  );
  const pastFilter = state.pastFilter || "all";
  const pastBase = getPastRows(state, isNew, seedPast).filter((row) =>
    matchesQuery(getClient(state, row.client).name, row.svc),
  );
  const pastItems = pastBase.filter((row) => isPastIn(row, pastFilter));

  const dayGroups: { off: number; items: DecoratedBooking[] }[] = [];
  upItems.forEach((booking) => {
    let group = dayGroups.find(({ off }) => off === booking.off);
    if (!group) {
      group = { off: booking.off, items: [] };
      dayGroups.push(group);
    }
    group.items.push(booking);
  });
  const getTotal = (items: { price: number }[]) => {
    let total = 0;
    for (const { price } of items) total += price;
    return total;
  };
  const upGroups = dayGroups.map(({ off, items }, index) => ({
    key: String(off),
    isLast: index === dayGroups.length - 1,
    label: off === 0 ? "Today" : off === 1 ? "Tomorrow" : dayInfo(off).label,
    isToday: off === 0,
    meta:
      items.length +
      (items.length === 1 ? " booking" : " bookings") +
      " · £" +
      getTotal(items),
    items,
  }));
  const upCount = upItems.length;
  const pastCount = pastItems.length;
  const filterCount = isPast
    ? pastFilter !== "all"
      ? 1
      : 0
    : Number(state.fRange !== "all") +
      Number(state.fStatus !== "all") +
      Number(state.fPay !== "any");
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
    if (state.fRange !== "all")
      filterChips.push({
        label: getLabel(RANGE, state.fRange),
        clear: () => setState({ fRange: "all" }),
      });
    if (state.fStatus !== "all")
      filterChips.push({
        label: getLabel(STATUS, state.fStatus),
        clear: () => setState({ fStatus: "all" }),
      });
    if (state.fPay !== "any")
      filterChips.push({
        label: getLabel(PAY, state.fPay),
        clear: () => setState({ fPay: "any" }),
      });
  } else if (pastFilter !== "all")
    filterChips.push({
      label: getLabel(PAST_STATUS, pastFilter),
      clear: () => setState({ pastFilter: "all" }),
    });
  const closeFilter = () => {
    setState({ filtOut: true });
    window.clearTimeout(studio.context.timers.filter);
    studio.context.timers.filter = window.setTimeout(
      () => setState({ filtOpen: false, filtOut: false }),
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
    id === "today"
      ? booking.off === 0
      : id === "7"
        ? booking.off < 7
        : id === "30"
          ? booking.off < 30
          : true;
  const filterSections = isPast
    ? [
        {
          label: "Status",
          opts: PAST_STATUS.map((option) =>
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
          opts: RANGE.map((option) =>
            toChip(
              option,
              state.fRange === option.id,
              () => setState({ fRange: option.id }),
              upBase.filter(
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
          opts: STATUS.map((option) =>
            toChip(
              option,
              state.fStatus === option.id,
              () => setState({ fStatus: option.id }),
              upBase.filter(
                (booking) =>
                  isInRange(booking) &&
                  isPay(booking) &&
                  (option.id === "all" || booking.st === option.id),
              ).length,
            ),
          ),
        },
        {
          label: "Payment",
          opts: PAY.map((option) =>
            toChip(
              option,
              state.fPay === option.id,
              () => setState({ fPay: option.id }),
              upBase.filter(
                (booking) =>
                  isInRange(booking) &&
                  isStatus(booking) &&
                  (option.id === "any"
                    ? true
                    : option.id === "unpaid"
                      ? booking.paid === "none" || booking.paid === "link"
                      : booking.paid === "full"),
              ).length,
            ),
          ),
        },
      ];
  const shownCount = isPast ? pastCount : upCount;
  let earned = 0;
  for (const row of pastItems)
    if (row.status === "Completed") earned += row.price;

  // ---- the day / week timeline ----
  const yDay = getY(DAY_PX);
  const yWeek = getY(WEEK_PX);
  const getBlocked = (
    offset: number,
    y: (minutes: number) => number,
    minHeight: number,
  ) =>
    state.blocked
      .filter((block) => isBlockOn(block, offset))
      .map((block) => {
        const [from, to] = getBlockRange(state, block, offset);
        const top = y(clampMinutes(from));
        const height = y(clampMinutes(to)) - top;
        const colour = getBlockColour();
        const foreground = colour.fg || colour.hex;
        return {
          key: block.id,
          top: (top + 1).toFixed(0) + "px",
          h: Math.max(minHeight, height - 3).toFixed(0) + "px",
          hex: foreground,
          line: hexA(colour.hex, 0.45),
          bg: hexA(colour.hex, 0.16),
          label:
            (block.reason || "Blocked").replace(/( · )?Repeats.*$/, "") +
            (block.span === "All day" ? " · All day" : ""),
          open: (event: MouseEvent) => {
            event.stopPropagation();
            actions.blockPop(block, event);
          },
        };
      });
  const hours = getWorkingHours(state, state.dayIdx || 0);
  const hourLines: {
    key: number;
    label: string;
    hh: string;
    top: string;
    isWorking: boolean;
  }[] = [];
  for (let hour = 0; hour <= END_HOUR; hour++)
    hourLines.push({
      key: hour,
      label: hour === 24 ? "" : (hour < 10 ? "0" : "") + hour + ":00",
      hh: (hour < 10 ? "0" : "") + hour,
      top: yDay(hour * 60).toFixed(0) + "px",
      isWorking:
        hours.on && hour * 60 >= toMin(hours.s) && hour * 60 <= toMin(hours.e),
    });
  const quarters: string[] = [];
  for (let minutes = 15; minutes < END_HOUR * 60; minutes += 15)
    if (minutes % 60) quarters.push(yDay(minutes).toFixed(0) + "px");
  const dayBlocks = dayBookings.map((booking) => ({
    booking,
    top: yDay(toMin(booking.time)).toFixed(0) + "px",
    h:
      Math.max(40, (durToMin(booking.dur) / 60) * DAY_PX - 3).toFixed(0) + "px",
  }));
  const stubs = dayBookings
    .map((booking) => {
      const buffer = getBookingBuffer(state, booking.svc);
      if (!buffer) return null;
      const end = toMin(booking.time) + durToMin(booking.dur);
      const extra = getExtraByName(state, booking.svc);
      const travel = buffer - extra;
      const tone = getTileTone(state, booking.svc);
      return {
        key: booking.id,
        top: (yDay(end) - 1).toFixed(0) + "px",
        h: Math.max(15, (buffer / 60) * DAY_PX - 1).toFixed(0) + "px",
        bg: tone.bg,
        fg: tone.meta,
        dash: tone.hatch,
        label:
          "+" +
          buffer +
          "m" +
          (extra && travel
            ? " (" + travel + "m travel)"
            : travel
              ? " travel"
              : ""),
      };
    })
    .filter((item) => item !== null);
  const nowLine =
    state.dayIdx === 0 && nowMin > 0 && nowMin < END_HOUR * 60
      ? { top: yDay(nowMin).toFixed(0) + "px", label: hhmm(nowMin) }
      : null;
  const isWeek = state.calMode === "week";
  const weekMonday = (() => {
    const offset = state.dayIdx || 0;
    return offset - ((dateAt(offset).getDay() + 6) % 7);
  })();
  const weekCols = isWeek
    ? Array.from({ length: 7 }, (_, index) => {
        const offset = weekMonday + index;
        const info = dayInfo(offset);
        const isToday = offset === 0;
        const isSelected = offset === (state.dayIdx || 0);
        return {
          key: offset,
          dow: info.dow,
          num: info.num,
          isToday,
          isSelected,
          offBands: getOffBands(state, offset, yWeek),
          blocked: getBlocked(offset, yWeek, 18),
          blocks: upcoming
            .filter(({ off }) => off === offset)
            .map((booking) => ({
              booking,
              top: yWeek(toMin(booking.time)).toFixed(0) + "px",
              h:
                Math.max(
                  30,
                  (durToMin(booking.dur) / 60) * WEEK_PX - 3,
                ).toFixed(0) + "px",
            })),
          nowTop:
            isToday && nowMin > 0 && nowMin < END_HOUR * 60
              ? yWeek(nowMin).toFixed(0) + "px"
              : null,
          pickDay: () => actions.setCal({ dayIdx: offset }),
          tap: (event: MouseEvent<HTMLElement>) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const quarter = Math.floor(
              (event.clientY - rect.top) / (WEEK_PX / 4),
            );
            const minutes = Math.min(23 * 60 + 45, Math.max(0, quarter * 15));
            const dayHours = getWorkingHours(state, offset);
            const isOutside =
              !dayHours.on ||
              minutes < toMin(dayHours.s) ||
              minutes >= toMin(dayHours.e);
            const width = 236;
            const height = 132;
            const pad = 12;
            setState({
              dayIdx: offset,
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
    const target = hasToday
      ? yWeek(Math.max(0, nowMin - 60))
      : firsts.length
        ? Math.min(...firsts) - 24
        : yWeek(8 * 60);
    studio.context.memo.wkTarget = Math.max(0, target);
    studio.context.memo.wkKey = weekMonday;
  }
  const weekHours: { key: number; label: string; top: string }[] = [];
  for (let hour = 0; hour <= END_HOUR; hour++)
    weekHours.push({
      key: hour,
      label: hour === 24 ? "" : (hour < 10 ? "0" : "") + hour + ":00",
      top: yWeek(hour * 60).toFixed(0) + "px",
    });
  const quickTime = state.qa?.time ?? null;
  const quickMinutes = quickTime ? toMin(quickTime) : null;
  const isQuickOutside =
    quickMinutes != null &&
    (!hours.on ||
      quickMinutes < toMin(hours.s) ||
      quickMinutes >= toMin(hours.e));

  // ---- the date picker ----
  const pickerMonth = state.bkCalM == null ? now.getMonth() : state.bkCalM;
  const pickerYear = state.bkCalY == null ? now.getFullYear() : state.bkCalY;
  const hasBookings = new Set(upcoming.map(({ off }) => off));
  const isPrevOff =
    state.bkCalY == null ||
    state.bkCalY < now.getFullYear() ||
    (state.bkCalY === now.getFullYear() &&
      (state.bkCalM ?? 0) <= now.getMonth());
  const pickerDays = getMiniCalDays(
    pickerMonth,
    pickerYear,
    state.dayIdx,
    (offset) => actions.setDay({ dayIdx: offset, dpOpen: false }),
    -3650,
    (offset, isSelected) =>
      hasBookings.has(offset)
        ? isSelected
          ? "var(--brand-yellow)"
          : "var(--accent-700)"
        : "transparent",
  );

  // ---- past list ----
  const pastGroups: {
    month: string;
    items: ReturnType<typeof getPastItem>[];
  }[] = [];
  const getPastItem = (row: PastRecord, index: number) => {
    const client = getClient(state, row.client);
    const tone = PAST_TONE[row.status] ?? {
      bg: "var(--quiet)",
      color: "var(--text-secondary)",
      icon: "",
      meta: "",
    };
    const isOk = row.status === "Completed";
    const isFresh = !!row.at && Date.now() - row.at < 86400000;
    const duration = row.dur || getServiceDur(state, row.svc);
    const end = toMin(row.time) + durToMin(duration);
    return {
      key: String(getPastKey(row)),
      clientName: client.name,
      imgSrc: getAvatarSrc(client),
      isFaded: !isOk,
      svc: row.svc,
      when: row.when,
      time: timeRange(row.time, duration),
      start: row.time,
      endTime:
        "–" +
        String(Math.floor(end / 60) % 24).padStart(2, "0") +
        ":" +
        String(end % 60).padStart(2, "0"),
      stripe: getTileTone(state, row.svc).bar,
      status: row.status,
      badgeBg: tone.bg,
      badgeColor: tone.color,
      open: () => actions.openSheet("past", { pastSel: getPastKey(row) }),
      priceLabel: "£" + row.price,
      isStruck: !isOk,
      priceMeta:
        row.feePending && !row.waived
          ? isFresh
            ? "Fee pending"
            : row.feeLabel + " fee kept"
          : row.meta || (isOk ? "Paid" : tone.meta),
      dly: (index * 0.04).toFixed(2) + "s",
    };
  };
  getPastRows(state, isNew, seedPast)
    .filter((row) => isPastIn(row, pastFilter))
    .filter(
      (row) =>
        !query ||
        getClient(state, row.client).name.toLowerCase().includes(query) ||
        row.svc.toLowerCase().includes(query),
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

  return {
    upcoming,
    isList,
    isCal: !isList,
    isUpcoming,
    isPast,
    calDateLabel:
      (state.dayIdx === 0
        ? "Today, "
        : state.dayIdx === 1
          ? "Tomorrow, "
          : "") +
      day.dow +
      " " +
      day.num +
      " " +
      day.mon,
    weekStrip: Array.from({ length: 7 }, (_, index) => {
      const offset = mondayOffset + index;
      const info = dayInfo(offset);
      const count = upcoming.filter(({ off }) => off === offset).length;
      const isSelected = offset === state.dayIdx;
      return {
        key: offset,
        dow: info.dow,
        num: info.num,
        isSelected,
        isToday: offset === 0,
        isPast: offset < 0,
        dot: count
          ? isSelected
            ? "var(--brand-yellow)"
            : "var(--accent-700)"
          : "transparent",
        pick: () => actions.setDay({ dayIdx: offset }),
      };
    }),
    filterCount: filterCount ? String(filterCount) : "",
    isFilterActive: filterCount > 0 || !!query,
    filterChips,
    clearFilter: () =>
      setState({
        fRange: "all",
        fStatus: "all",
        fPay: "any",
        pastFilter: "all",
        bkQ: "",
      }),
    closeFilter,
    filterSections,
    filterCta:
      "Show " + shownCount + (shownCount === 1 ? " booking" : " bookings"),
    upGroups,
    listSummary: isPast
      ? pastFilter === "off"
        ? pastCount +
          (pastCount === 1 ? " appointment" : " appointments") +
          " did not go ahead"
        : pastCount +
          (pastCount === 1 ? " appointment" : " appointments") +
          " · " +
          pastItems.filter(({ status }) => status === "Completed").length +
          " completed"
      : upCount +
        (upCount === 1 ? " booking" : " bookings") +
        (state.fRange === "all" ? " upcoming" : ""),
    listTotal: isPast
      ? "£" + earned + " earned"
      : "£" + getTotal(upItems) + " booked",
    isListEmpty: isPast ? pastCount === 0 : upCount === 0,
    listEmptyTitle: isNew
      ? "No appointments yet"
      : filterCount > 0 || query
        ? "Nothing matches"
        : isPast
          ? "No past appointments"
          : "Nothing booked yet",
    listEmptyBody: isNew
      ? "Share your booking link to get your first one."
      : filterCount > 0 || query
        ? "Try a wider date range or clear the filters."
        : isPast
          ? "Completed appointments will appear here once the date has passed."
          : "Add a booking yourself or leave your days open for online bookings.",
    pastGroups,
    // timeline
    hourLines,
    quarters,
    dayBlocks,
    stubs,
    nowLine,
    dayOffBands: getOffBands(state, state.dayIdx || 0, yDay),
    dayBlocked: getBlocked(state.dayIdx || 0, yDay, 22),
    dayHeight: END_HOUR * DAY_PX + 14 + "px",
    isWeek,
    weekCols,
    weekHours,
    weekHeight: END_HOUR * WEEK_PX + 14 + "px",
    quickHint: isQuickOutside
      ? hours.on
        ? "Outside your hours (" +
          hours.s +
          "–" +
          hours.e +
          "). You can still book it."
        : "You’re closed this day. You can still book it."
      : "What would you like to do here?",
    isQuickOutside,
    // date picker
    pickerTitle: MONTHS_LONG[pickerMonth] + " " + pickerYear,
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
    tlTap: (event: MouseEvent<HTMLElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const quarter = Math.floor(
        (event.clientY - rect.top) / (rect.height / 96),
      );
      const minutes = Math.min(23 * 60 + 45, Math.max(0, quarter * 15));
      const dayHours = getWorkingHours(state, state.dayIdx);
      const isOutside =
        !dayHours.on ||
        minutes < toMin(dayHours.s) ||
        minutes >= toMin(dayHours.e);
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
        setState({ qa: { time: hhmm(minutes) }, qaOut: false });
        return;
      }
      setState({ pop: { time: hhmm(minutes), x, y, warn: isOutside } });
    },
  };
};

export type BookingsView = ReturnType<typeof getBookingsView>;
export { DAY_PX, WEEK_PX };
