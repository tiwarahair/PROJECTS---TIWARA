import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMediaQuery } from "../../hooks/use-media-query";
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
import type { StudioCategory, StudioPatch, StudioState } from "./studio-types";

export interface StudioProps {
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

interface WelcomeNote {
  at: number;
  first?: string;
  cats?: string[];
}

const readWelcome = (): WelcomeNote | null => {
  try {
    const note = JSON.parse(
      localStorage.getItem("tw_welcome") || "null",
    ) as WelcomeNote | null;

    return note && Date.now() - note.at < 864e5 ? note : null;
  } catch {
    return null;
  }
};

/** A new account starts with categories from onboarding and two draft starter services. */
const seedNewAccount = (
  state: StudioState,
  welcome: WelcomeNote | null,
): StudioState => {
  let picked = ["braids"];

  if (welcome && Array.isArray(welcome.cats) && welcome.cats.length)
    picked = welcome.cats;

  const categories: StudioCategory[] = [];

  picked.forEach((groupId) => {
    const group = TAXONOMY.find(({ id }) => id === groupId);

    if (group)
      categories.push({
        id: `c${categories.length + 1}`,
        name: group.name,
        sort: categories.length,
        colour:
          CATEGORY_COLOURS[categories.length % CATEGORY_COLOURS.length]
            ?.value ?? "",
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
    (getQueryParam("account") || props.account || "populated") === "new";

  const memoRef = useRef<StudioContext["memo"]>({});

  const [state, setRawState] = useState(() => {
    const welcome = readWelcome();

    memoRef.current.welcome = welcome;
    const initial = getInitialStudioState();

    return isNew ? seedNewAccount(initial, welcome) : initial;
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

  // the new state is readable straight away (getState) and the render follows
  const setState = (patch: StudioPatch) => {
    const current = stateRef.current;

    const next = {
      ...current,
      ...(typeof patch === "function" ? patch(current) : patch),
    };

    stateRef.current = next;
    setRawState(next);
  };

  const context: StudioContext = {
    getState: () => stateRef.current,
    setState,
    timers,
    memo: memoRef.current,
    isWide: () => wideRef.current,
  };

  const actions = createStudioActions(context);
  const serviceActions = createServiceActions(context, actions);
  const latest = useRef({ actions, serviceActions, context });

  latest.current = { actions, serviceActions, context };

  useEffect(() => {
    const {
      actions: current,
      serviceActions: services,
      context: currentContext,
    } = latest.current;

    const memo = currentContext.memo;
    const mountTimers: number[] = [];

    if (memo.welcome) {
      const welcome = memo.welcome;

      try {
        localStorage.removeItem("tw_welcome");
      } catch {
        // storage can be blocked
      }

      mountTimers.push(
        window.setTimeout(() => {
          memo.welcome = null;
          currentContext.setState({ tab: "home", setupMinimised: false });
          const welcomeName = welcome.first || "there";

          current.showToast(
            `Welcome, ${welcomeName}. Let’s get you ready to take bookings.`,
          );
        }, 600),
      );
    }

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
