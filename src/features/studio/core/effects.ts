import { useEffect, useLayoutEffect } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { useUnsavedChanges } from "../../../hooks/use-unsaved-changes";
import type { StudioActions, StudioContext } from "./actions";
import { applyFixture } from "./fixtures";
import { watchStudio } from "./live";
import { getQueryParam, getSteps } from "./model";
import type { ServiceActions } from "../services/actions";
import { getDiscardConfirm } from "./unsaved";
import type { StudioState } from "./types";

export interface LatestStudio {
  actions: StudioActions;
  serviceActions: ServiceActions;
  context: StudioContext;
}

type LatestRef = RefObject<LatestStudio>;

// a real account hears about its bookings changing while Studio is open
export const useLiveStudio = (
  latest: LatestRef,
  stylistId: string | undefined,
) =>
  useEffect(() => {
    if (!stylistId) return;

    return watchStudio(stylistId, () => ({
      context: latest.current.context,
      showToast: latest.current.actions.showToast,
      closeSheet: latest.current.actions.closeSheet,
    }));
  }, [latest, stylistId]);

export const useStripeReturn = (
  latest: LatestRef,
  stylistId: string | undefined,
) => {
  useEffect(() => {
    if (!stylistId) return;

    // back from Stripe: ?stripe=return (or refresh, when its link expired)
    const reason = getQueryParam("stripe");

    if (!reason) return;

    const url = new URL(window.location.href);

    url.searchParams.delete("stripe");
    window.history.replaceState(window.history.state, "", url);
    void latest.current.actions.catchUpWithStripe(reason);
  }, [latest, stylistId]);

  // back from Stripe via the browser's Back button
  useEffect(() => {
    const onPageShow = ({ persisted }: PageTransitionEvent) => {
      if (persisted) latest.current.context.applyState({ stripeBusy: false });
    };

    window.addEventListener("pageshow", onPageShow);

    return () => window.removeEventListener("pageshow", onPageShow);
  }, [latest]);
};

// leaving Studio (sign out, links) with unsaved edits
export const useLeaveGuard = (
  latest: LatestRef,
  blocker: ReturnType<typeof useUnsavedChanges>,
) =>
  useEffect(() => {
    const { applyState: apply, getState } = latest.current.context;

    if (blocker.state !== "blocked" || getState().confirm) return;

    apply({
      confirm: getDiscardConfirm(
        () => {
          apply({ confirm: null });
          blocker.proceed();
        },
        () => {
          blocker.reset();
          apply({ confirm: null });
        },
      ),
    });
  }, [latest, blocker]);

export const useStudioMount = (
  latest: LatestRef,
  fixtureProp: string | undefined,
  setTick: Dispatch<SetStateAction<number>>,
) =>
  useEffect(() => {
    const {
      actions: current,
      serviceActions: services,
      context: currentContext,
    } = latest.current;

    const { memo, timers } = currentContext;
    const mountTimers: number[] = [];

    // just signed up (?welcome=1): open Home with a greeting
    if (getQueryParam("welcome") === "1")
      mountTimers.push(
        window.setTimeout(() => {
          currentContext.setState({ tab: "home", setupMinimised: false });

          current.showToast(
            `Welcome, ${currentContext.getState().owner.first || "there"}. Let’s get you ready to take bookings.`,
          );
        }, 600),
      );

    const fixture = fixtureProp || getQueryParam("fixture");

    mountTimers.push(
      window.setTimeout(() => {
        memo.seenDone = getSteps(currentContext.getState());

        // demo states are dev-only; production builds drop this branch and the fixtures module
        if (import.meta.env.DEV && fixture)
          applyFixture(fixture, currentContext, current, services);
      }, 0),
    );

    const tick = window.setInterval(() => {
      latest.current.actions.followToday();
      latest.current.actions.autoComplete();
      setTick((count) => count + 1);
    }, 30000);

    current.followToday();
    current.autoComplete();

    if (currentContext.getState().tab === "bookings")
      current.scrollCalendarToNow();

    return () => {
      mountTimers.forEach((timer) => window.clearTimeout(timer));
      window.clearInterval(tick);
      Object.values(timers).forEach((timer) => window.clearTimeout(timer));
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
    // mount-only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

const isOverlayOpen = (state: StudioState) =>
  !!(
    state.sheet ||
    state.quickAdd ||
    state.confirm ||
    state.actionSheet ||
    state.endCalendarOpen ||
    state.filterOpen ||
    state.twoFactor
  );

// after every update: follow the calendar to now, restore the week scroll, lock the page under overlays
export const usePageFollow = (latest: LatestRef, state: StudioState) =>
  useLayoutEffect(() => {
    const { memo } = latest.current.context;
    const calendarKey = `${state.tab}|${state.bookingsLayout}|${state.dayIndex}`;

    if (calendarKey !== memo.calendarKey) {
      memo.calendarKey = calendarKey;

      if (state.tab === "bookings" && state.bookingsLayout !== "list")
        latest.current.actions.scrollCalendarToNow();
    }

    const week = document.querySelector<HTMLElement>("[data-wk-scroll]");
    const weekKey = week ? `${state.calendarMode}|${memo.weekKey}` : null;

    if (week && weekKey !== memo.weekScrolledKey) {
      memo.weekScrolledKey = weekKey;
      week.scrollTop = memo.weekScrollTarget || 0;
    } else if (!week) memo.weekScrolledKey = null;

    const isLocked = isOverlayOpen(state);

    if (isLocked !== memo.locked) {
      memo.locked = isLocked;
      document.documentElement.style.overflow = isLocked ? "hidden" : "";
      document.body.style.overflow = isLocked ? "hidden" : "";
    }
  });
