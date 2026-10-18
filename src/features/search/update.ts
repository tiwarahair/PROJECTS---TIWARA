// Shared by Search's action groups: how they patch the state, and the patches they share.
import type { FilterDraft, SearchState } from "./state";

type Patch =
  Partial<SearchState> | ((state: SearchState) => Partial<SearchState>);

export type Update = (patch: Patch) => void;

export const CLOSE_ALL: Partial<SearchState> = {
  whatOpen: false,
  whereOpen: false,
  whatText: null,
  whereText: null,
  whatTyped: false,
  whereTyped: false,
  whatIndex: -1,
  whereIndex: -1,
};

export const DEFAULT_DRAFT: FilterDraft = {
  venues: [],
  maxPrice: null,
  radius: 10,
  sort: "distance",
};

/** Back to the sheet's menu after a pick on mobile. */
export const toMenu = ({ mobileView }: SearchState) =>
  mobileView ? { mobileView: "menu" as const } : {};
