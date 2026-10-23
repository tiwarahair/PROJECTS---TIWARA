import { useCallback, useEffect, useRef, useState } from "react";
import type { Stylist } from "../../../types/stylist";
import { clearDraft, saveDraft } from "../logic/draft";
import { getInitialBooking } from "../logic/state";
import type { StatePatch } from "../logic/types";

export const useFlowState = (stylist: Stylist) => {
  const [initial] = useState(() => getInitialBooking(stylist));
  const [state, setRawState] = useState(initial);
  const [, setTick] = useState(0);
  const stateRef = useRef(state);

  stateRef.current = state;
  const afterCommit = useRef<(() => void)[]>([]);
  const crumbsRef = useRef<HTMLDivElement>(null);

  /** setState with a merge patch and an optional callback after the render. */
  const setState = useCallback((patch: StatePatch, callback?: () => void) => {
    if (callback) afterCommit.current.push(callback);

    setRawState((current) => ({
      ...current,
      ...(typeof patch === "function" ? patch(current) : patch),
    }));
  }, []);

  useEffect(() => {
    const callbacks = afterCommit.current.splice(0);

    for (const callback of callbacks) callback();
  });

  /** Step changes scroll so the step title sits at the top. */
  const scrollToTitle = useCallback(() => {
    const crumbs = crumbsRef.current;

    if (!crumbs) {
      window.scrollTo(0, 0);

      return;
    }

    const y = crumbs.getBoundingClientRect().bottom + window.scrollY;

    window.scrollTo(0, Math.max(0, y - 40));
  }, []);

  // 1s tick: the hold countdown (and its expiry) and the "Resend email (Ns)" countdown
  useEffect(() => {
    const interval = window.setInterval(() => {
      const { confirmed, account, hold, holdExpired, paying, confirming } =
        stateRef.current;

      if (confirmed && account.sent && Date.now() - account.sentAt < 31000) {
        setTick((tick) => tick + 1);

        return;
      }

      if (!hold || confirmed || holdExpired || paying || confirming) return;

      if (Date.now() >= hold.until)
        setState({ holdExpired: true, loginStart: null });
      else setTick((tick) => tick + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [setState]);

  // after every update: keep the draft (or drop it once confirmed)
  useEffect(() => {
    if (state === initial) return;

    if (state.confirmed) {
      clearDraft(state.id);
    } else saveDraft(state);
  }, [state, initial]);

  return { initial, state, stateRef, setState, crumbsRef, scrollToTitle };
};

export type FlowState = ReturnType<typeof useFlowState>;
