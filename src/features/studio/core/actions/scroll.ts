import { getWorkingHours } from "../model";
import type { StudioState } from "../types";
import { clear } from "./context";
import type { StudioContext } from "./context";

/** The nearest scrolling ancestor, else the Studio body. */
const getScroller = (from?: Element | null): Element | null => {
  let element = from?.parentElement ?? null;

  while (element) {
    const overflowY = getComputedStyle(element).overflowY;

    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      element.scrollHeight > element.clientHeight + 1
    )
      return element;

    element = element.parentElement;
  }

  return document.getElementById("stbody");
};

export const createScrollActions = ({
  getState,
  setState,
  timers,
  memo,
}: StudioContext) => {
  const scrollBody = (
    top: number,
    isSmooth: boolean,
    from?: Element | null,
  ) => {
    const body = getScroller(from);

    if (!body) {
      window.scrollTo(0, top);

      return;
    }

    try {
      body.scrollTo({ top, behavior: isSmooth ? "smooth" : "auto" });
    } catch {
      body.scrollTop = top;
    }
  };

  const scrollToNow = () => {
    const state = getState();

    if (state.tab !== "bookings" || state.bookingsLayout === "list") return;

    const hours = getWorkingHours(state, state.dayIndex || 0);

    const element =
      (state.dayIndex === 0 && document.getElementById("tl-now")) ||
      document.getElementById(
        `tl-h-${hours.on ? hours.start.slice(0, 2) : "09"}`,
      ) ||
      document.getElementById("tl-h-09");

    if (!element) return;

    const body = getScroller(element);

    if (!body) return;

    const rect = element.getBoundingClientRect();
    const bodyRect = body.getBoundingClientRect();
    const maxTop = Math.max(0, body.scrollHeight - body.clientHeight);
    const pad = Math.min(230, Math.max(40, body.clientHeight * 0.28));

    const top = Math.min(
      maxTop,
      Math.max(0, rect.top - bodyRect.top + body.scrollTop - pad),
    );

    scrollBody(top, true, element);
  };

  const scrollCalendarToNow = () => {
    clear(timers, "calendarScroll");

    timers.calendarScroll = window.setTimeout(
      () => requestAnimationFrame(scrollToNow),
      140,
    );
  };

  const setCalendar = (patch: Partial<StudioState>) => {
    setState(patch);

    if (patch.bookingsLayout !== "list") return scrollCalendarToNow();

    clear(timers, "calendarScroll");
    requestAnimationFrame(() => scrollBody(0, false));
  };

  // pre-sets the calendar key so moving between days doesn't re-scroll to now
  const setDay = (patch: Partial<StudioState>) => {
    const state = getState();

    const dayIndex = patch.dayIndex != null ? patch.dayIndex : state.dayIndex;

    memo.calendarKey = `${state.tab}|${state.bookingsLayout}|${dayIndex}`;
    setState(patch);
  };

  const slideDay = (direction: number) => {
    setDay({ dayIndex: getState().dayIndex + direction, slideFrom: direction });
    cancelAnimationFrame(memo.slideFrame ?? 0);

    memo.slideFrame = requestAnimationFrame(() =>
      requestAnimationFrame(() => setState({ slideFrom: null })),
    );
  };

  return { scrollBody, scrollCalendarToNow, setCalendar, setDay, slideDay };
};
