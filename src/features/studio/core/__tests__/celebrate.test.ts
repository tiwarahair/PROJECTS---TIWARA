import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getStudioSeed } from "../../../../test/studio-seed";
import { createPageActions } from "../actions/pages";
import { createStudioSync } from "../sync";
import { getInitialStudioState } from "../initial-state";
import { seedFromAccount } from "../seed-account";
import type { StudioPatch, StudioState } from "../types";

const finishSetup = (state: StudioState) => {
  let current = state;

  const setState = (patch: StudioPatch) => {
    current = {
      ...current,
      ...(typeof patch === "function" ? patch(current) : patch),
    };
  };

  const { checkDone } = createPageActions(
    {
      getState: () => current,
      setState,
      applyState: setState,
      sync: createStudioSync("stylist-1", vi.fn(), vi.fn()),
      timers: {},
      memo: {},
      isWide: () => false,
    },
    { scrollBody: vi.fn() },
  );

  checkDone();
  vi.runAllTimers();

  return current;
};

// every step done, as if the last one was just finished
const getJustFinished = (mode: StudioState["policy"]["mode"]): StudioState => {
  const seeded = seedFromAccount(getInitialStudioState(), getStudioSeed());

  return {
    ...seeded,
    celebrated: false,
    check: { availability: true, profile: true, stripe: true },
    tax: { kind: "sole" },
    twoFactorSettings: {
      devices: [{ id: "device-1", name: "Phone", backup: false }],
    },
    policy: { ...seeded.policy, mode },
  };
};

describe("finishing setup", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("suggests a policy when the stylist hasn't set one", () => {
    expect(finishSetup(getJustFinished("none")).nudge).toBe(true);
  });

  it("doesn't suggest a policy the stylist already has", () => {
    const state = finishSetup(getJustFinished("deposit"));

    expect(state.linkCard).toBe(true);
    expect(state.nudge).toBe(false);
  });
});
