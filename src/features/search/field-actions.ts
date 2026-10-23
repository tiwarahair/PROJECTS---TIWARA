// The What and Where fields: focus, typing, keys and picking a suggestion.
import type { ChangeEvent, FocusEvent, KeyboardEvent } from "react";
import type { LatLng } from "../../lib/google-maps";
import type { StyleSelection } from "./logic";
import { CURRENT_PLACE } from "./state";
import type { SearchState, WhatChip } from "./state";
import type { getWhatModel, getWhereModel, SuggestionRow } from "./suggestions";
import { CLOSE_ALL, toMenu } from "./update";
import type { Update } from "./update";
import type { PlaceSuggestion } from "./use-place-suggestions";

type Field = "what" | "where";

interface FieldContext {
  update: Update;
  getState: () => SearchState;
  navigate: (path: string) => void;
  /** Focuses the field's input (the sheet's on mobile) after the render. */
  focusField: (field: Field) => void;
  selection: StyleSelection;
  what: ReturnType<typeof getWhatModel>;
  where: ReturnType<typeof getWhereModel>;
  resolvePlace: (suggestion: PlaceSuggestion) => Promise<LatLng | null>;
}

/** One field's dropdown state: open, the text in the input, whether it was typed, the highlighted row. */
const fieldPatch = (
  field: Field,
  isOpen: boolean,
  text: string | null,
  isTyped = false,
  index = -1,
): Partial<SearchState> =>
  field === "what"
    ? { whatOpen: isOpen, whatText: text, whatTyped: isTyped, whatIndex: index }
    : {
        whereOpen: isOpen,
        whereText: text,
        whereTyped: isTyped,
        whereIndex: index,
      };

const getIndex = (state: SearchState, field: Field) =>
  field === "what" ? state.whatIndex : state.whereIndex;

const NO_STYLE = { group: "", type: "", freeText: "" };

export const createFieldActions = ({
  update,
  getState,
  navigate,
  focusField,
  selection,
  what,
  where,
  resolvePlace,
}: FieldContext) => {
  const pickWhat = (row: SuggestionRow) => {
    if (row.kind === "stylist" && row.slug) {
      navigate(`/${row.slug}`);

      return;
    }

    const style = { ...NO_STYLE };

    if (row.kind === "group" && row.group) style.group = row.group.slug;
    else if (row.kind === "type" && row.serviceType)
      style.type = row.serviceType.slug;
    else if (row.kind === "all-results") style.freeText = row.raw ?? "";

    update((current) => ({
      query: { ...current.query, ...style },
      ...fieldPatch("what", false, null),
      ...toMenu(current),
    }));
  };

  // a Google place is searched once its point arrives
  const pickLocation = ({ kind, label, place }: SuggestionRow) => {
    update((current) => ({
      query: { ...current.query, ...(kind === "current" ? CURRENT_PLACE : {}) },
      ...fieldPatch("where", false, null),
      ...toMenu(current),
    }));

    if (place)
      void resolvePlace(place).then((point) => {
        if (point)
          update((current) => ({
            query: { ...current.query, location: label, ...point },
          }));
      });
  };

  const pickTypedWhat = () => {
    if (what.raw) pickWhat({ kind: "all-results", label: "", raw: what.raw });
  };

  const pickFirstPlace = () => {
    const [first] = where.locationRows;

    if (where.raw && first) pickLocation(first);
  };

  const focus =
    (field: Field, display: string) =>
    (event: FocusEvent<HTMLInputElement>) => {
      const input = event.target;
      const state = getState();

      if (field === "what" ? state.whatOpen : state.whereOpen) return;

      update({
        ...fieldPatch(field === "what" ? "where" : "what", false, null),
        ...fieldPatch(field, true, display),
        dateOpen: false,
        priceOpen: false,
        sortOpen: false,
      });

      window.setTimeout(() => input.select(), 0);
    };

  const change = (field: Field) => (event: ChangeEvent<HTMLInputElement>) =>
    update(fieldPatch(field, true, event.target.value, true));

  const hover = (field: Field) => (index: number) => {
    if (getIndex(getState(), field) !== index)
      update(field === "what" ? { whatIndex: index } : { whereIndex: index });
  };

  /** Arrows move the highlight, Enter picks it (or the fallback), Escape closes the dropdown. */
  const keys =
    (
      field: Field,
      rows: SuggestionRow[],
      pick: (row: SuggestionRow) => void,
      fallback: () => void,
    ) =>
    (event: KeyboardEvent<HTMLInputElement>) => {
      const state = getState();
      const index = getIndex(state, field);
      const count = rows.length;
      const text = field === "what" ? state.whatText : state.whereText;
      const isTyped = field === "what" ? state.whatTyped : state.whereTyped;

      const highlight = (next: number) =>
        update(fieldPatch(field, true, text, isTyped, count ? next : -1));

      if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(event.key))
        event.preventDefault();

      if (event.key === "ArrowDown") highlight((index + 1) % count);

      if (event.key === "ArrowUp")
        highlight(index <= 0 ? count - 1 : index - 1);

      if (event.key === "Enter") {
        const row = index >= 0 ? rows[index] : undefined;

        if (row) pick(row);
        else fallback();
      }

      if (event.key === "Escape") {
        update((current) => ({
          ...fieldPatch(field, false, null),
          ...toMenu(current),
        }));

        if (!state.mobileView) event.currentTarget.blur();
      }
    };

  return {
    pickWhat,
    pickLocation,
    focusWhat: focus("what", selection.display),
    focusWhere: focus("where", where.display),
    changeWhat: change("what"),
    changeWhere: change("where"),
    hoverWhat: hover("what"),
    hoverWhere: hover("where"),
    keyWhat: keys("what", what.flat, pickWhat, pickTypedWhat),
    keyWhere: keys("where", where.flat, pickLocation, pickFirstPlace),
    pickWhatChip: (chip: WhatChip) => {
      update({ whatChip: chip, whatIndex: -1 });
      focusField("what");
    },
    clearWhat: () => {
      update((current) => ({
        query: { ...current.query, ...NO_STYLE },
        ...fieldPatch("what", true, ""),
      }));

      focusField("what");
    },
    clearWhere: () => {
      update((current) => ({
        query: { ...current.query, ...CURRENT_PLACE },
        ...fieldPatch("where", true, ""),
      }));

      focusField("where");
    },
    clearStyle: () =>
      update((current) => ({
        query: { ...current.query, ...NO_STYLE },
        whatText: null,
        whatTyped: false,
      })),
    clearArea: () =>
      update((current) => ({
        query: { ...current.query, ...CURRENT_PLACE },
        whereText: null,
        whereTyped: false,
      })),
    /** The Search button: picks what's typed, otherwise just closes everything. */
    search: () => {
      const state = getState();

      if (state.whatOpen && what.raw) pickTypedWhat();
      else if (state.whereOpen && where.raw && where.locationRows.length)
        pickFirstPlace();
      else update({ ...CLOSE_ALL, dateOpen: false });
    },
  };
};
