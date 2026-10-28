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

const DAY_MS = 24 * 60 * 60 * 1000;

const daysAgo = (days: number) =>
  new Date(Date.now() - days * DAY_MS).toISOString();

const getLiveSeed = (
  daysLive: number,
  remindedAt: string | null = null,
  mode = "none",
  nudgedAt: string | null = null,
) => {
  const seed = getSetUpSeed();
  const [policy] = seed.studio.payment_policies;

  return {
    ...seed,
    studio: {
      ...seed.studio,
      went_live_at: daysAgo(daysLive),
      stylist_private: seed.studio.stylist_private && {
        ...seed.studio.stylist_private,
        policy_reminded_at: remindedAt,
        policy_nudged_at: nudgedAt,
      },
      payment_policies: policy ? [{ ...policy, mode }] : [],
    },
  };
};

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

  it("reminds a stylist with no policy once they've been live for 2 days", () => {
    const state = seedFromAccount(getInitialStudioState(), getLiveSeed(2));

    expect(state.nudge).toBe(true);
    expect(state.policyReminder).toBe(true);
  });

  it("doesn't remind too early, twice, or once they have a policy", () => {
    const seed = (patch: Parameters<typeof getLiveSeed>) =>
      seedFromAccount(getInitialStudioState(), getLiveSeed(...patch)).nudge;

    expect(seed([1])).toBe(false);
    expect(seed([3, "2026-01-05T10:00:00+00:00"])).toBe(false);
    expect(seed([3, null, "deposit"])).toBe(false);
    // live for a week, but setup only finished (and first nudged) yesterday
    expect(seed([7, null, "none", daysAgo(1)])).toBe(false);
    expect(seed([7, null, "none", daysAgo(2)])).toBe(true);
  });
});
