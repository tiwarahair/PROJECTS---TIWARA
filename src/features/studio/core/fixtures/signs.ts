import { getTipX } from "../actions/feedback";
import { getQueryParam } from "../model";
import type { StudioState, VariationRow } from "../types";
import { withServices } from "./context";
import type { FixtureContext, FixtureTable } from "./context";
import { getPartingOptions } from "./data";

const NEGATIVE_LARGE = {
  negative: true,
  priceDelta: "-90",
  hoursDelta: "-2",
  minutesDelta: "0",
};

const showFixtureTip = (
  tip: string,
  setState: (patch: Partial<StudioState>) => void,
) => {
  const selector =
    tip === "ck"
      ? 'button[aria-label="Offer Small"]'
      : 'button[aria-label="Take off price and time"]';

  const element = document.querySelector(selector);

  if (!element) return;

  const rect = element.getBoundingClientRect();

  const text =
    tip === "ck"
      ? "Offer this size"
      : "Takes off the base price and time. Click to add instead.";

  setState({ tip: { key: "fx", text, x: getTipX(rect), y: rect.top } });
};

const openSignFixture = (fixture: FixtureContext) =>
  withServices(fixture, () => {
    const { key, context, serviceActions } = fixture;
    const { setState } = context;

    serviceActions.openWizard("edit", fixture.knotless());
    const isError = key === "wiz-sign-err";
    const isOwn = key === "wiz-own-sign";

    const getSize = (row: VariationRow) =>
      row.label === "Large" && isError ? { ...row, ...NEGATIVE_LARGE } : row;

    setState(({ wizard }) => {
      if (!wizard) return {};

      const draft = {
        ...wizard.draft,
        sizesOn: !isOwn,
        sizes: wizard.draft.sizes.map(getSize),
      };

      const ownEdit = {
        index: 0,
        name: "Parting",
        options: getPartingOptions(),
        error: "",
      };

      return {
        wizard: { ...wizard, step: 3, draft, ...(isOwn ? { ownEdit } : {}) },
      };
    });

    const tip = getQueryParam("tip");

    if (tip) window.setTimeout(() => showFixtureTip(tip, setState), 700);
  });

export const signFixtures: FixtureTable = {
  "wiz-sign": openSignFixture,
  "wiz-sign-err": openSignFixture,
  "wiz-own-sign": openSignFixture,
};
