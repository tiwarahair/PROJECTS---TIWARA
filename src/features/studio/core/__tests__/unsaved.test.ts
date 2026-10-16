import { describe, expect, it } from "vitest";
import { getInitialStudioState } from "../data";
import {
  getDiscardPatch,
  getSavedSettings,
  getSheetDraft,
  hasUnsavedPage,
  hasUnsavedSheet,
  isLeavingPage,
} from "../unsaved";

const getStudio = () => {
  const state = getInitialStudioState();

  return { state, memo: { saved: getSavedSettings(state) } };
};

describe("studio-unsaved", () => {
  it("a settings page is unsaved only once its values differ from the last save", () => {
    const { state, memo } = getStudio();
    const rulesPage = { ...state, page: "rules" as const };

    expect(hasUnsavedPage(rulesPage, memo)).toBe(false);

    expect(
      hasUnsavedPage(
        { ...rulesPage, rules: { ...state.rules, maxNotice: 12 } },
        memo,
      ),
    ).toBe(true);
  });

  it("availability counts hours and pause; an untouched pause matches a turned-off one", () => {
    const { state, memo } = getStudio();
    const page = { ...state, page: "availability" as const };

    expect(
      hasUnsavedPage({ ...page, pause: { on: false, until: "" } }, memo),
    ).toBe(false);

    expect(
      hasUnsavedPage({ ...page, pause: { on: true, until: "" } }, memo),
    ).toBe(true);
  });

  it("discarding puts the saved values back", () => {
    const { state, memo } = getStudio();

    const edited = {
      ...state,
      page: "profile" as const,
      profile: { ...state.profile, about: "Changed" },
    };

    expect(hasUnsavedPage(edited, memo)).toBe(true);

    expect(getDiscardPatch(edited, memo).profile?.about).toBe(
      state.profile.about,
    );
  });

  it("only page and tab changes count as leaving", () => {
    const { state } = getStudio();

    expect(isLeavingPage(state, { page: "rules" })).toBe(true);
    expect(isLeavingPage(state, { sheet: "add" })).toBe(false);
  });

  it("a draft sheet is unsaved once its draft differs from how it opened", () => {
    const { state } = getStudio();
    const block = { ...state, sheet: "block" as const };
    const memo = { sheetDraft: getSheetDraft(block) };

    expect(hasUnsavedSheet(block, memo)).toBe(false);

    expect(
      hasUnsavedSheet(
        { ...block, blockDraft: { ...block.blockDraft, reason: "Lunch" } },
        memo,
      ),
    ).toBe(true);
  });
});
