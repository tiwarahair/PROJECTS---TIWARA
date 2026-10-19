import { useCallback, useMemo, useRef, useState } from "react";
import { useMediaQuery } from "../../../hooks/use-media-query";
import { useUnsavedChanges } from "../../../hooks/use-unsaved-changes";
import { createStudioActions } from "./actions";
import type { StudioContext } from "./actions";
import {
  useLeaveGuard,
  usePageFollow,
  useLiveStudio,
  useStripeReturn,
  useStudioMount,
} from "./effects";
import { getInitialStudioState } from "./initial-state";
import { seedFromAccount, seedNewAccount } from "./seed-account";
import type { StudioSeed } from "./seed-account";
import { getSeedPast } from "./seed-bookings";
import { getQueryParam } from "./model";
import { createServiceActions } from "../services/actions";
import { useCatalogueSync } from "../services/catalogue-sync";
import { createStudioSync } from "./sync";
import {
  getDiscardConfirm,
  getDiscardPatch,
  getSavedSettings,
  hasUnsavedPage,
  hasUnsavedSheet,
  isLeavingPage,
} from "./unsaved";
import type { StudioPatch } from "./types";

export type { StudioSeed } from "./seed-account";

export interface StudioProps {
  /** A signed-in stylist's own data; without it Studio shows the demo. */
  seed?: StudioSeed;
  account?: "populated" | "new";
  setup?: boolean;
  payouts?: "verifying" | "action" | "paused" | "active";
  signIn?: "email" | "google" | "apple";
  /** Demo: how card charges behave in checkout. */
  cardDeclines?: "none" | "soft" | "hard";
  /** Demo: the Earnings tab's scenario. */
  earnings?: "default" | "onhold" | "paused";
  fixture?: string;
}

export const useStudio = (props: StudioProps) => {
  const isNew =
    !!props.seed ||
    (getQueryParam("account") || props.account || "populated") === "new";

  const memoRef = useRef<StudioContext["memo"]>({});

  const [state, setRawState] = useState(() => {
    const initial = getInitialStudioState();

    if (props.seed) return seedFromAccount(initial, props.seed);

    return isNew ? seedNewAccount(initial) : initial;
  });

  const [seedPast] = useState(() => (isNew ? [] : getSeedPast()));
  const [, setTick] = useState(0);
  const stateRef = useRef(state);

  stateRef.current = state;
  const timers = useRef<Record<string, number>>({}).current;
  const isWide = useMediaQuery("(min-width:640px)");
  const isDesktop = useMediaQuery("(min-width:1024px)");
  const wideRef = useRef(isWide);

  wideRef.current = isWide;

  const memo = memoRef.current;

  memo.saved ??= getSavedSettings(state);

  // the new state is readable straight away (getState) and the render follows
  const applyState = (patch: StudioPatch) => {
    const current = stateRef.current;

    const next = {
      ...current,
      ...(typeof patch === "function" ? patch(current) : patch),
    };

    stateRef.current = next;
    setRawState(next);
  };

  // leaving a settings page with unsaved edits asks first
  const setState = (patch: StudioPatch) => {
    const current = stateRef.current;
    const changes = typeof patch === "function" ? patch(current) : patch;

    if (!isLeavingPage(current, changes) || !hasUnsavedPage(current, memo))
      return applyState(changes);

    applyState({
      confirm: getDiscardConfirm(() =>
        applyState({
          ...getDiscardPatch(stateRef.current, memo),
          confirm: null,
          ...changes,
        }),
      ),
    });
  };

  const hasUnsaved = useCallback(() => {
    const current = stateRef.current;

    return (
      hasUnsavedPage(current, memoRef.current) ||
      (!!current.sheet && hasUnsavedSheet(current, memoRef.current))
    );
  }, []);

  const blocker = useUnsavedChanges(hasUnsaved);

  const stylistId = state.account?.stylistId;

  // one sync per stylist for Studio's lifetime, so its save queue survives re-renders
  const sync = useMemo(
    () =>
      stylistId
        ? createStudioSync(
            stylistId,
            (patch) => latest.current.context.applyState(patch),
            (message) => latest.current.actions.showToast(message),
          )
        : null,
    [stylistId],
  );

  const context: StudioContext = {
    getState: () => stateRef.current,
    setState,
    applyState,
    sync,
    timers,
    memo,
    isWide: () => wideRef.current,
  };

  useCatalogueSync(state, sync);

  const actions = createStudioActions(context);
  const serviceActions = createServiceActions(context, actions);
  const latest = useRef({ actions, serviceActions, context });

  latest.current = { actions, serviceActions, context };

  useStripeReturn(latest, stylistId);
  useLiveStudio(latest, stylistId);
  useLeaveGuard(latest, blocker);
  useStudioMount(latest, props.fixture, setTick);
  usePageFollow(latest, state);

  return {
    state,
    setState,
    props,
    isNew,
    isWide,
    isDesktop,
    actions,
    serviceActions,
    context,
    seedPast,
  };
};

export type StudioController = ReturnType<typeof useStudio>;
