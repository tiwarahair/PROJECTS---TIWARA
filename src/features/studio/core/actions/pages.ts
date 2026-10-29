import { getSteps } from "../model";
import type { StudioPage, StudioPatch } from "../types";
import { clear } from "./context";
import type { StudioContext } from "./context";

interface PageDeps {
  scrollBody: (top: number, isSmooth: boolean) => void;
}

const SETUP_STEPS = ["availability", "profile", "secure", "services"] as const;

export const createPageActions = (
  { getState, setState, applyState, timers, memo, isWide }: StudioContext,
  { scrollBody }: PageDeps,
) => {
  const openPage = (name: StudioPage, fromSetup?: boolean) => {
    clear(timers, "sheet");

    setState(({ setupMinimised }) => ({
      tab: "settings",
      page: name,
      pageFromSetup: !!fromSetup,
      sheet: null,
      out: false,
      selectedClientId: null,
      setupMinimised: fromSetup ? true : setupMinimised,
    }));

    scrollBody(0, false);
  };

  const closePage = () => {
    setState({ page: null, pageFromSetup: false });
    scrollBody(0, false);
  };

  const leavePage = () => {
    const isHome = getState().pageFromSetup;

    const getLeavePatch = (): StudioPatch => {
      if (isHome)
        return {
          page: null,
          pageFromSetup: false,
          tab: "home",
          setupMinimised: false,
        };

      return isWide()
        ? { pageFromSetup: false }
        : { page: null, pageFromSetup: false };
    };

    applyState(getLeavePatch());
    scrollBody(0, false);
  };

  const celebrate = () => {
    const wide = isWide();

    setState({
      celebrated: true,
      nudge: getState().policy.mode === "none",
      setupMinimised: false,
      setupExit: wide ? "hold" : null,
      linkCard: !wide,
    });

    if (!wide) return;

    clear(timers, "setupExit");

    timers.setupExit = window.setTimeout(() => {
      setState({ setupExit: "out" });

      timers.setupExit = window.setTimeout(
        () => setState({ setupExit: null, linkCard: true }),
        210,
      );
    }, 1200);
  };

  /** Ticks off finished setup steps and celebrates when all four are done. */
  const checkDone = () => {
    clear(timers, "checkDone");

    timers.checkDone = window.setTimeout(() => {
      const state = getState();
      const steps = getSteps(state);

      const seen = memo.seenDone ?? {
        availability: false,
        profile: false,
        secure: false,
        services: false,
      };

      const key = SETUP_STEPS.find((step) => steps[step] && !seen[step]);

      memo.seenDone = { ...steps };

      if (key) setState({ lastDone: key });

      if (SETUP_STEPS.every((step) => steps[step]) && !state.celebrated)
        celebrate();
    }, 0);
  };

  return { openPage, closePage, leavePage, checkDone };
};
