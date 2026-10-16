import type { FixtureTable } from "./context";
import { SOLE_TAX } from "./data";

export const setupFixtures: FixtureTable = {
  checklist: ({ setBase }) => setBase({}),
  "cal-day": ({ context, actions }) => {
    context.setState({
      tab: "bookings",
      bookingsLayout: "cal",
      dayIndex: 0,
      setupMinimised: true,
    });

    window.setTimeout(() => {
      try {
        actions.scrollCalendarToNow();
      } catch {
        // the calendar may not be laid out yet
      }
    }, 120);
  },
  "home-gate": ({ setBase }) =>
    setBase({
      check: { availability: false, profile: false, stripe: false },
    }),
  "share-locked": ({ setBase }) =>
    setBase({ tab: "settings", page: "profile", shareTip: true }),
  "all-done": ({ context, actions, setBase, both, stripeDone, drafts }) => {
    context.memo.seenDone = {
      availability: true,
      profile: true,
      secure: true,
      services: false,
    };

    setBase({
      twoFactorSettings: { devices: both },
      tax: SOLE_TAX,
      check: stripeDone,
      services: drafts.map((service, index) =>
        index === 0 ? { ...service, status: "active" } : service,
      ),
    });

    actions.checkDone();
  },
};
