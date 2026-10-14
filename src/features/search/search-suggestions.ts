// What / Where dropdown models (rows, chips, sections).
import { serviceGroups } from "../../data";
import type { SearchRow } from "../../lib/search-api";
import { toPhotoUrl } from "../../lib/public-stylist";
import type { ServiceGroup } from "../../types/service-group";
import type { ServiceType } from "../../types/service-type";
import { matchTypes } from "../../utils/services";
import { SEARCH_ICONS } from "./search-icons";
import type { Place, StyleSelection } from "./search-logic";
import type { SearchState, WhatChip } from "./search-state";
import type { PlaceSuggestion } from "./use-place-suggestions";

type RowKind =
  "all" | "group" | "type" | "stylist" | "all-results" | "current" | "location";

export interface SuggestionRow {
  kind: RowKind;
  label: string;
  subtitle?: string;
  icon?: string;
  image?: string;
  on?: boolean;
  group?: ServiceGroup;
  serviceType?: ServiceType;
  /** A stylist row's profile slug. */
  slug?: string;
  place?: PlaceSuggestion;
  raw?: string;
}

export interface RowView {
  key: string;
  row: SuggestionRow;
  index: number;
  before: string;
  match: string;
  after: string;
  isActive: boolean;
  isOn: boolean;
}

/** Splits the label around the typed text so the match can be bolded. */
const getRowView = (
  row: SuggestionRow,
  index: number,
  activeIndex: number,
  query: string,
): RowView => {
  const { label, kind, subtitle = "" } = row;
  const at = query ? label.toLowerCase().indexOf(query) : -1;

  const parts =
    at < 0
      ? { before: label, match: "", after: "" }
      : {
          before: label.slice(0, at),
          match: label.slice(at, at + query.length),
          after: label.slice(at + query.length),
        };

  return {
    key: `${kind}:${label}:${subtitle}`,
    row,
    index,
    ...parts,
    isActive: index === activeIndex,
    isOn: !!row.on,
  };
};

export interface WhatChipView {
  key: WhatChip;
  label: string;
  count: string;
  on: boolean;
}

/** stylists: matching live stylists from search_stylists (all of them when nothing is typed). */
export const getWhatModel = (
  state: SearchState,
  selection: StyleSelection,
  stylists: SearchRow[],
) => {
  const raw = state.whatTyped ? String(state.whatText || "").trim() : "";
  const query = raw.toLowerCase();

  const groupRow = (group: ServiceGroup): SuggestionRow => ({
    kind: "group",
    group,
    label: group.name,
    icon: SEARCH_ICONS[group.id] || SEARCH_ICONS.grid,
    on: selection.isGroup && selection.group?.id === group.id,
  });

  let styleRows: SuggestionRow[];

  if (!query) {
    styleRows = [
      {
        kind: "all" as const,
        label: "All styles",
        icon: SEARCH_ICONS.grid,
        on: !selection.has,
      },
      ...serviceGroups.map(groupRow),
    ];
  } else {
    styleRows = [
      ...serviceGroups
        .filter(({ name }) => name.toLowerCase().includes(query))
        .map(groupRow),
      ...matchTypes(query)
        .filter(({ isOther }) => !isOther)
        .map((type): SuggestionRow => ({
          kind: "type",
          serviceType: type,
          label: type.name,
          subtitle: serviceGroups.find(({ id }) => id === type.groupId)?.name,
          on: !!selection.serviceType && selection.serviceType.id === type.id,
        })),
    ];
  }

  const stylistRows = stylists.map(
    ({ slug, business_name, area_label, cover_path }): SuggestionRow => ({
      kind: "stylist",
      slug,
      label: business_name,
      subtitle: area_label ?? "",
      image: cover_path ? toPhotoUrl(cover_path) : "",
    }),
  );

  const styleCount = styleRows.filter(({ kind }) => kind !== "all").length;
  const stylistCount = stylistRows.length;
  const chip = state.whatChip;
  const sections: { key: string; title: string; rows: SuggestionRow[] }[] = [];

  if (chip !== "stylists" && styleRows.length)
    sections.push({ key: "styles", title: "Styles", rows: styleRows });

  if (chip !== "styles" && stylistCount && (query || chip === "stylists"))
    sections.push({ key: "stylists", title: "Stylists", rows: stylistRows });

  const isEmpty = !!query && !sections.length;
  const flat = sections.flatMap(({ rows }) => rows);

  if (query && !isEmpty)
    flat.push({
      kind: "all-results",
      label: `See all results for ‘${raw}’`,
      raw,
      icon: SEARCH_ICONS.search,
    });

  let index = 0;

  const sectionViews = sections.map(({ key, title, rows }) => ({
    key,
    title,
    rows: rows.map((row) => getRowView(row, index++, state.whatIndex, query)),
  }));

  const lastRow = flat[flat.length - 1];

  const seeAll =
    query && !isEmpty && lastRow
      ? [getRowView(lastRow, flat.length - 1, state.whatIndex, "")]
      : [];

  const chips: WhatChipView[] = (
    [
      ["all", "All", styleCount + stylistCount],
      ["styles", "Styles", styleCount],
      ["stylists", "Stylists", stylistCount],
    ] as const
  ).map(([key, label, count]) => ({
    key,
    label,
    count: String(count),
    on: chip === key,
  }));

  return {
    raw,
    query,
    flat,
    chips,
    sections: sectionViews,
    seeAll,
    isEmpty,
    emptyText: `No styles or stylists match ‘${raw}’. Try a broader term like braids or locs.`,
  };
};

/** Empty: just "Current location". Typed: Google's matching areas, towns and postcodes. */
export const getWhereModel = (
  state: SearchState,
  place: Place,
  places: { suggestions: PlaceSuggestion[]; isSearching: boolean },
) => {
  const raw = state.whereTyped ? String(state.whereText || "").trim() : "";
  const query = raw.toLowerCase();

  const locationRows = query
    ? places.suggestions.map((suggestion): SuggestionRow => ({
        kind: "location",
        label: suggestion.label,
        subtitle: suggestion.subtitle,
        icon: SEARCH_ICONS.pin,
        place: suggestion,
      }))
    : [];

  const currentRows: SuggestionRow[] = query
    ? []
    : [
        {
          kind: "current",
          label: "Current location",
          icon: SEARCH_ICONS.arrow,
          on: place.current,
        },
      ];

  return {
    raw,
    query,
    locationRows,
    flat: [...currentRows, ...locationRows],
    current: currentRows.map((row, index) =>
      getRowView(row, index, state.whereIndex, ""),
    ),
    rows: locationRows.map((row, index) =>
      getRowView(row, index + currentRows.length, state.whereIndex, query),
    ),
    isEmpty: !!query && !places.isSearching && !locationRows.length,
    emptyText: `No places match ‘${raw}’. Try a town, area or postcode.`,
    display: place.current ? "" : place.name,
  };
};
