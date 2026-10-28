import { beforeEach, describe, expect, it } from "vitest";
import { getStudioRow, getStudioSeed } from "../../../../test/studio-seed";
import { getInitialStudioState } from "../initial-state";
import { SETUP_MINIMISED_KEY, seedFromAccount } from "../seed-account";

const getSetUpSeed = () =>
  getStudioSeed({
    studio: getStudioRow({
      availability_confirmed_at: "2026-01-02T10:00:00+00:00",
      profile_confirmed_at: "2026-01-02T10:00:00+00:00",
      charges_enabled: true,
      payouts_enabled: true,
      stylist_tax_details: {
        kind: "sole",
        first_name: "Amara",
        middle_name: null,
        last_name: "Okonkwo",
        legal_name: null,
        company_name: null,
        company_number: null,
        date_of_birth: "1990-04-12",
        is_address_same: true,
        line1: null,
        line2: null,
        city: null,
        postcode: null,
        ni_hint: "C",
      },
    }),
    devices: [{ id: "device-1", name: "Phone", backup: false }],
  });

describe("seedFromAccount", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("doesn't replay the finish celebration for a stylist who is already set up", () => {
    const state = seedFromAccount(getInitialStudioState(), getSetUpSeed());

    expect(state.celebrated).toBe(true);
    expect(state.linkCard).toBe(false);
    expect(state.nudge).toBe(false);
  });

  it("leaves the celebration to come for a stylist still setting up", () => {
    const state = seedFromAccount(getInitialStudioState(), getStudioSeed());

    expect(state.celebrated).toBe(false);
  });

  it("keeps the checklist minimised for the rest of the tab", () => {
    window.sessionStorage.setItem(SETUP_MINIMISED_KEY, "1");

    const state = seedFromAccount(getInitialStudioState(), getStudioSeed());

    expect(state.setupMinimised).toBe(true);
  });
});
