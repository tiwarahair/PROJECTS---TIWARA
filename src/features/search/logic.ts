// What the search state asks for: the place, the chosen style and the search_stylists arguments.
import { serviceGroups, serviceTypes } from "../../data";
import type { LatLng } from "../../lib/google-maps";
import type { SearchArgs } from "../../lib/search-api";
import type { ServiceGroup } from "../../types/service-group";
import type { ServiceType } from "../../types/service-type";
import type { FilterDraft, SearchState, Venue } from "./state";

/** A typed area (with its point once picked) or the device's location (null until known). */
export interface Place {
  name: string;
  current: boolean;
  point: LatLng | null;
}

export const getPlace = (
  { location, lat, lng }: SearchState["query"],
  position: LatLng | null,
): Place =>
  location === "Current location"
    ? { name: location, current: true, point: position }
    : {
        name: location,
        current: false,
        point: lat != null && lng != null ? { lat, lng } : null,
      };

export interface StyleSelection {
  serviceType: ServiceType | null;
  group: ServiceGroup | null;
  isGroup: boolean;
  freeText: string;
  name: string;
  display: string;
  has: boolean;
}

const getSelectedGroup = (
  serviceType: ServiceType | null,
  groupSlug: string,
) => {
  if (serviceType)
    return serviceGroups.find(({ id }) => id === serviceType.groupId);

  if (groupSlug) return serviceGroups.find(({ slug }) => slug === groupSlug);

  return null;
};

export const getStyleSelection = ({ query }: SearchState): StyleSelection => {
  const serviceType = query.type
    ? serviceTypes.find(({ slug }) => slug === query.type) || null
    : null;

  const group = getSelectedGroup(serviceType, query.group);

  const freeText =
    !serviceType && !group ? String(query.freeText || "").trim() : "";

  // The type or group name; undefined only when neither is selected
  const label = serviceType ? serviceType.name : group?.name;

  return {
    serviceType,
    group: group || null,
    isGroup: !serviceType && !!group,
    freeText,
    name: label ?? (freeText ? `‘${freeText}’` : ""),
    display: label ?? freeText,
    has: !!(serviceType || group || freeText),
  };
};

/** "9am" / "2:30pm" → minutes after midnight. */
export const toDayMinutes = (time: string): number => {
  const match = String(time).match(/(\d+)(?::(\d+))?\s*(am|pm)?/i);

  if (!match) return 0;

  let hours = Number(match[1]);
  const meridiem = (match[3] || "").toLowerCase();

  if (meridiem === "pm" && hours < 12) hours += 12;

  if (meridiem === "am" && hours === 12) hours = 0;

  return hours * 60 + (Number(match[2]) || 0);
};

const toClock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** The chosen time of day as ["HH:MM", "HH:MM"], or null for any time. */
const getTimeBand = ({ time, customFrom, customTo }: SearchState) => {
  const bands: Record<string, [number, number]> = {
    morning: [0, 720],
    afternoon: [720, 1080],
    evening: [1080, 1440],
    custom: [toDayMinutes(customFrom), toDayMinutes(customTo)],
  };

  const band = bands[time];

  return band ? band.map(toClock) : null;
};

const VENUE_TYPES: Record<Venue, string[]> = {
  Salon: ["shop", "chair_rental"],
  "Home-based": ["home_based"],
  Mobile: ["mobile"],
};

/** search_stylists arguments for the current state, optionally with the filter sheet's draft. */
export const toSearchArgs = (
  state: SearchState,
  point: LatLng | null,
  overrides: Partial<FilterDraft> = {},
): SearchArgs => {
  const { serviceType, group, isGroup, freeText } = getStyleSelection(state);
  const venues = overrides.venues ?? state.venues;

  const maxPrice =
    "maxPrice" in overrides ? overrides.maxPrice : state.maxPrice;

  const [timeFrom, timeTo] = getTimeBand(state) ?? [];

  return {
    lat: point?.lat,
    lng: point?.lng,
    radius_miles: overrides.radius ?? state.radius,
    service_type: serviceType?.id,
    service_group: isGroup ? group?.id : undefined,
    search_text: freeText || undefined,
    venues: venues.length
      ? venues.flatMap((venue) => VENUE_TYPES[venue])
      : undefined,
    max_price_pence: maxPrice == null ? undefined : maxPrice * 100,
    on_date: state.query.date || undefined,
    time_from: timeFrom,
    time_to: timeTo,
    sort: overrides.sort ?? state.sort,
  };
};
