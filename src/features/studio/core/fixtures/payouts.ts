import type { StudioState } from "../types";
import type { FixtureContext, FixtureTable } from "./context";
import { LTD_TAX, SOLE_TAX } from "./data";

const setSecured = (
  { setBase, both }: FixtureContext,
  patch: Partial<StudioState> = {},
) => setBase({ twoFactorSettings: { devices: both }, ...patch });

const setPaid = (fixture: FixtureContext, patch: Partial<StudioState>) =>
  setSecured(fixture, { check: fixture.stripeDone, ...patch });

const openTaxForm = (fixture: FixtureContext) => {
  setSecured(fixture);
  fixture.actions.openTwoFactor("tax", { fixture: fixture.key.slice(4) });
};

const openSettings =
  (page: StudioState["page"], patch: Partial<StudioState> = {}) =>
  (fixture: FixtureContext) =>
    setPaid(fixture, { tab: "settings", page, ...patch });

export const payoutFixtures: FixtureTable = {
  "secure-tax": (fixture) => {
    setSecured(fixture);
    fixture.actions.openTwoFactor("secure");
  },
  "tax-home": (fixture) => {
    const { business } = fixture.state;

    setSecured(fixture, {
      business: {
        ...business,
        type: "home",
        details: {
          ...business.details,
          line1: "27 Heald Place",
          line2: "",
          city: "Manchester",
          postcode: "M14 5TQ",
        },
      },
    });

    fixture.actions.openTwoFactor("tax");
  },
  "tax-mobile": (fixture) => {
    const { business } = fixture.state;

    setSecured(fixture, {
      business: {
        ...business,
        type: "mobile",
        details: { ...business.details, basePostcode: "M16 8AF" },
      },
    });

    fixture.actions.openTwoFactor("tax");
  },
  "tax-shop": (fixture) => {
    setSecured(fixture);
    fixture.actions.openTwoFactor("tax");
  },
  "tax-name-no": openTaxForm,
  "tax-ltd": openTaxForm,
  "tax-err-empty": openTaxForm,
  "tax-err-initials": openTaxForm,
  "tax-err-dob": openTaxForm,
  "tax-err-under18": openTaxForm,
  "tax-err-ni": openTaxForm,
  "tax-err-conum": openTaxForm,
  "tax-err-pc": openTaxForm,
  "tax-learn": (fixture) => {
    setSecured(fixture);
    fixture.actions.openTwoFactor("learn", { from: "tax" });
  },
  "stripe-sheet": (fixture) => {
    setSecured(fixture, { tax: SOLE_TAX });
    window.setTimeout(() => fixture.actions.openSheet("stripe"), 50);
  },
  "pay-saved": openSettings("payouts", { tax: SOLE_TAX }),
  "pay-saved-ltd": openSettings("payouts", { tax: LTD_TAX }),
  "pay-hold": openSettings("payouts"),
  "pay-code": (fixture) => {
    openSettings("payouts", { tax: SOLE_TAX })(fixture);
    fixture.actions.openTwoFactor("taxcode", { flow: "info" });
  },
  "pay-edit": openSettings("payouts", { tax: SOLE_TAX, taxEdit: true }),
  "biz-legal": openSettings("business", { tax: SOLE_TAX }),
  "biz-legal-ltd": openSettings("business", { tax: LTD_TAX }),
  "earn-hold": (fixture) => setPaid(fixture, { tab: "earnings" }),
  "checklist-services": (fixture) => setPaid(fixture, { tax: SOLE_TAX }),
  "services-drafts": (fixture) =>
    setPaid(fixture, {
      tax: SOLE_TAX,
      tab: "services",
      servicesTab: "services",
    }),
};
