// Studio's ?fixture= review states. Each sets up one screen or sheet.
import type { ServiceActions } from "../../services/actions";
import type { StudioActions, StudioContext } from "../actions";
import type { StudioState } from "../types";
import { categoryFixtures } from "./categories";
import type { FixtureContext, FixtureSetup } from "./context";
import { payoutFixtures } from "./payouts";
import { scrollToSelector } from "./scroll";
import { setupFixtures } from "./setup";
import { signFixtures } from "./signs";
import { suggestionFixtures } from "./suggestions";
import { twoFactorFixtures } from "./two-factor";
import { wizardFixtures } from "./wizard";

export const getFixtures = () =>
  new Map<string, FixtureSetup>(
    Object.entries({
      ...setupFixtures,
      ...categoryFixtures,
      ...wizardFixtures,
      ...signFixtures,
      ...suggestionFixtures,
      ...payoutFixtures,
      ...twoFactorFixtures,
    }),
  );

const EXPANDED_SETUP = ["checklist", "checklist-services", "all-done"];

export const applyFixture = (
  key: string,
  context: StudioContext,
  actions: StudioActions,
  serviceActions: ServiceActions,
) => {
  const { getState, setState } = context;
  const state = getState();
  const main = [{ name: "Main phone", backup: false }];
  const both = main.concat([{ name: "Password manager", backup: true }]);

  const drafts = state.services.map((service) =>
    service.status === "active" ? { ...service, status: "draft" } : service,
  );

  const base: Partial<StudioState> = {
    check: { availability: true, profile: true, stripe: false },
    setupMinimised: !EXPANDED_SETUP.includes(key),
    tab: "home",
    page: null,
    twoFactorSettings: { devices: [] },
    tax: null,
    taxEdit: false,
    services: drafts,
  };

  if (/^pay-/.test(key)) scrollToSelector('[data-screen-label="Tax details"]');

  if (/^biz-legal/.test(key)) scrollToSelector('[data-sec="legal"]');

  const fixture: FixtureContext = {
    key,
    context,
    actions,
    serviceActions,
    state,
    main,
    both,
    drafts,
    stripeDone: { availability: true, profile: true, stripe: true },
    setBase: (patch) => setState({ ...base, ...patch }),
    toServices: () =>
      setState({
        tab: "services",
        servicesTab: "services",
        setupMinimised: true,
      }),
    knotless: () => getState().services.find(({ id }) => id === "knotless"),
  };

  getFixtures().get(key)?.(fixture);
};
