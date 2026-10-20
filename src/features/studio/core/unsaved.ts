// Unsaved edits in Studio: which settings page or sheet has them, and the "Discard changes?" prompt.
import { DISCARD_PROMPT } from "../../../hooks/use-unsaved-changes";
import type { StudioContext } from "./actions";
import type { ConfirmDialog, SheetKind, StudioState } from "./types";

type Memo = StudioContext["memo"];

const PROFILE_FIELDS = [
  "salon",
  "about",
  "site",
  "instagram",
  "tiktok",
  "youtube",
  "email",
] as const;

const SHEET_DRAFTS: Partial<Record<SheetKind, keyof StudioState>> = {
  svcwiz: "wizard",
  addon: "addonDraft",
  block: "blockDraft",
  closed: "closedDraft",
  clientEdit: "clientEdit",
  dispute: "disputeForm",
};

const NO_PAUSE = { on: false, until: "" };

const isSame = (first: unknown, second: unknown) =>
  JSON.stringify(first) === JSON.stringify(second);

const getProfileFields = ({ profile }: StudioState) =>
  Object.fromEntries(PROFILE_FIELDS.map((key) => [key, profile[key] ?? ""]));

/** What the settings pages last saved (or loaded), to compare edits against. */
export const getSavedSettings = (state: StudioState) => ({
  profile: getProfileFields(state),
  hours: state.hours,
  pause: state.pause ?? NO_PAUSE,
  rules: state.rules,
});

export type SavedSettings = ReturnType<typeof getSavedSettings>;

export const getSheetDraft = (state: StudioState) => {
  const key = state.sheet && SHEET_DRAFTS[state.sheet];

  return key ? JSON.stringify(state[key]) : undefined;
};

export const hasUnsavedSheet = (state: StudioState, memo: Memo) =>
  getSheetDraft(state) !== memo.sheetDraft;

export const hasUnsavedPage = (state: StudioState, memo: Memo) => {
  const { saved } = memo;

  switch (state.page) {
    case "profile":
      return (
        !isSame(getProfileFields(state), saved?.profile) || !!memo.isSlugEdited
      );
    case "availability":
      return (
        !isSame(state.hours, saved?.hours) ||
        !isSame(state.pause ?? NO_PAUSE, saved?.pause)
      );
    case "rules":
      return !isSame(state.rules, saved?.rules);
    case "policy":
      return !!memo.policyApi?.isDirty;
    case "business":
      return !!memo.businessApi?.canSave;
    case "personal":
    case "security":
      return !!memo.accountApi?.canSave;
    case "payouts":
      return state.taxEdit && !!memo.isTaxEdited;
    default:
      return false;
  }
};

export const isLeavingPage = (
  current: StudioState,
  changes: Partial<StudioState>,
) =>
  ("page" in changes && changes.page !== current.page) ||
  ("tab" in changes && changes.tab !== current.tab);

/** Puts the open page back to its saved values (pages that unmount drop their own edits). */
export const getDiscardPatch = (
  state: StudioState,
  memo: Memo,
): Partial<StudioState> => {
  memo.accountApi?.discard();
  memo.isSlugEdited = false;
  memo.isTaxEdited = false;

  if (!memo.saved) return { taxEdit: false };

  const { profile, hours, pause, rules } = memo.saved;

  return {
    profile: { ...state.profile, ...profile },
    hours,
    pause,
    rules,
    taxEdit: false,
  };
};

export const getDiscardConfirm = (
  discard: () => void,
  keepEditing?: () => void,
): ConfirmDialog => ({
  title: DISCARD_PROMPT.title,
  body: DISCARD_PROMPT.body,
  yesLabel: DISCARD_PROMPT.discard,
  noLabel: DISCARD_PROMPT.keep,
  yes: discard,
  onNo: keepEditing,
});
