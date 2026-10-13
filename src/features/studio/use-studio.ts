import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMediaQuery } from "../../hooks/use-media-query";
import { useUnsavedChanges } from "../../hooks/use-unsaved-changes";
import { createStudioActions } from "./studio-actions";
import type { StudioContext } from "./studio-actions";
import {
  CATEGORY_COLOURS,
  TAXONOMY,
  getInitialStudioState,
  getSeedPast,
} from "./studio-data";
import { applyFixture } from "./studio-fixtures";
import { getQueryParam, getSteps } from "./studio-model";
import { createServiceActions } from "./studio-service-actions";
import type { StylistStudio } from "../../lib/studio-api";
import { toStudioPatch } from "./studio-records";
import { useCatalogueSync } from "./studio-catalogue-sync";
import { createStudioSync } from "./studio-sync";
import {
  getDiscardConfirm,
  getDiscardPatch,
  getSavedSettings,
  hasUnsavedPage,
  hasUnsavedSheet,
  isLeavingPage,
} from "./studio-unsaved";
import type { StudioCategory, StudioPatch, StudioState } from "./studio-types";

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

/** The signed-in stylist and their business, loaded before Studio opens. */
export interface StudioSeed {
  owner: StudioState["owner"];
  studio: StylistStudio;
}

const getCategoryColour = (sort: number) =>
  CATEGORY_COLOURS[sort % CATEGORY_COLOURS.length]?.value ?? "";

/** A real account: everything from the database; nothing booked yet. */
const seedFromAccount = (
  state: StudioState,
  { owner, studio }: StudioSeed,
): StudioState => {
  const patch = toStudioPatch(studio, state);

  return {
    ...state,
    ...patch,
    owner,
    account: {
      stylistId: studio.id,
      slug: studio.slug,
      slugChangedAt: studio.slug_changed_at,
    },
    notifications: [],
    twoFactorSettings: { devices: [] },
    categories: (patch.categories ?? []).map((category) => ({
      ...category,
      colour: category.colour || getCategoryColour(category.sort),
    })),
  };
};

/** Demo boards (?account=new): a new account picked braids at sign-up. */
const seedNewAccount = (state: StudioState): StudioState => {
  const picked = ["braids"];

  const categories: StudioCategory[] = [];

  picked.forEach((groupId) => {
    const group = TAXONOMY.find(({ id }) => id === groupId);

    if (group)
      categories.push({
        id: `c${categories.length + 1}`,
        name: group.name,
        sort: categories.length,
        colour: getCategoryColour(categories.length),
      });
  });

  const primary = TAXONOMY.find(({ id }) => id === picked[0]) ?? TAXONOMY[0];
  const isBraids = !primary || primary.id === "braids";

  const drafts = state.services.slice(0, 2).map((service) => ({
    ...service,
    status: "draft",
    categoryId: categories[0] ? categories[0].id : null,
    ...(isBraids
      ? {}
      : {
          taxonomyId: primary.id,
          subcategory: primary.subcategories[0] ?? "",
          typeId: null,
          name: primary.subcategories[0] ?? "",
          sizes: [],
          lengths: [],
          own: [],
          addons: [],
        }),
  }));

  if (!isBraids && drafts[1]) {
    const name = primary.subcategories[1] || primary.subcategories[0] || "";

    drafts[1] = {
      ...drafts[1],
      id: `${drafts[1].id}2`,
      subcategory: name,
      name,
    };
  }

  return {
    ...state,
    policy: { ...state.policy, mode: "none" },
    twoFactorSettings: { devices: [] },
    categories,
    services: drafts,
  };
};

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

  const [seedPast] = useState(getSeedPast);
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
    memo: memoRef.current,
    isWide: () => wideRef.current,
  };

  useCatalogueSync(state, context.sync);

  const actions = createStudioActions(context);
  const serviceActions = createServiceActions(context, actions);
  const latest = useRef({ actions, serviceActions, context });

  latest.current = { actions, serviceActions, context };

  // leaving Studio (sign out, links) with unsaved edits
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
  }, [blocker]);

  useEffect(() => {
    const {
      actions: current,
      serviceActions: services,
      context: currentContext,
    } = latest.current;

    const memo = currentContext.memo;
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

    const fixture = props.fixture || getQueryParam("fixture");

    mountTimers.push(
      window.setTimeout(() => {
        memo.seenDone = getSteps(currentContext.getState());

        // demo states are dev-only; production builds drop this branch and the fixtures module
        if (import.meta.env.DEV && fixture)
          applyFixture(fixture, currentContext, current, services);
      }, 0),
    );

    const tick = window.setInterval(() => {
      latest.current.actions.autoComplete();
      setTick((count) => count + 1);
    }, 30000);

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

  // after every update: follow the calendar to now, restore the week scroll, lock the page under overlays
  useLayoutEffect(() => {
    const memo = memoRef.current;
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

    const isLocked = !!(
      state.sheet ||
      state.quickAdd ||
      state.confirm ||
      state.actionSheet ||
      state.endCalendarOpen ||
      state.filterOpen ||
      state.twoFactor
    );

    if (isLocked !== memo.locked) {
      memo.locked = isLocked;
      document.documentElement.style.overflow = isLocked ? "hidden" : "";
      document.body.style.overflow = isLocked ? "hidden" : "";
    }
  });

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
