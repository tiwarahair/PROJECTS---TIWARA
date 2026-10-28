import { getSteps, isLive } from "../core/model";
import type { StudioController } from "../core/use-studio";

const SETUP_KEYS = ["availability", "profile", "secure", "services"] as const;

export const SETUP_COUNT = SETUP_KEYS.length;

type SetupRow = [(typeof SETUP_KEYS)[number], string, string, () => void];

export const openServicesTab = ({ setState, actions }: StudioController) => {
  setState({
    tab: "services",
    servicesTab: "services",
    page: null,
    serviceStatusFilter: "all",
  });

  actions.scrollBody(0, false);
};

/** The four setup steps with their actions. */
export const getSetupRows = (studio: StudioController): SetupRow[] => {
  const { actions } = studio;

  return [
    [
      "availability",
      "Set up availability",
      "Working days and hours, blocked time, closed periods",
      () => actions.openPage("availability", true),
    ],
    [
      "profile",
      "Set up your profile",
      "Cover photo, description, portfolio and contact links",
      () => actions.openPage("profile", true),
    ],
    [
      "secure",
      "Get paid: 2FA, tax details and Stripe",
      "Secure your account and set up payouts. Takes about 5 minutes.",
      () => actions.openTwoFactor("secure"),
    ],
    [
      "services",
      "Add services",
      "Finish your 2 starter services or add your own. You need at least one to take bookings.",
      () => openServicesTab(studio),
    ],
  ];
};

export const getSetupProgress = (studio: StudioController) => {
  const steps = getSteps(studio.state);
  const doneCount = SETUP_KEYS.filter((key) => steps[key]).length;

  return {
    steps,
    doneCount,
    isComplete: doneCount === SETUP_COUNT,
  };
};

/** Whether the go-live gate applies: the account can't take bookings yet. */
export const isGated = (studio: StudioController) => !isLive(studio.state);
