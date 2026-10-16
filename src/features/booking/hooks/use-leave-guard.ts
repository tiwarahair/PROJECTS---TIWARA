import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useUnsavedChanges } from "../../../hooks/use-unsaved-changes";
import type { FlowState } from "./use-flow-state";

export const useLeaveGuard = ({ state, stateRef, setState }: FlowState) => {
  const navigate = useNavigate();
  const isLeaving = useRef(false);

  const hasStarted = useCallback(() => {
    const { serviceId, confirmed } = stateRef.current;

    return !isLeaving.current && !!serviceId && !confirmed;
  }, [stateRef]);

  const blocker = useUnsavedChanges(hasStarted);

  useEffect(() => {
    if (blocker.state !== "blocked" || stateRef.current.leave) return;

    const { pathname, search } = blocker.location;

    setState({ leave: pathname + search });
  }, [blocker, setState, stateRef]);

  const keepBooking = () => {
    if (blocker.state === "blocked") blocker.reset();

    setState({ leave: null });
  };

  const confirmLeave = () => {
    const href = state.leave;

    isLeaving.current = true;

    setState({ hold: null, leave: null }, () => {
      if (blocker.state === "blocked") blocker.proceed();
      else if (href) navigate(href);
    });
  };

  return { isLeaving, actions: { keepBooking, confirmLeave } };
};
