// Search results logic: place, selected style, price band, first slot, filtering and results.
import {
  searchLocations,
  serviceGroups,
  serviceTypes,
  stylists,
} from "../../data";
import type { Service } from "../../types/service";
import type { ServiceGroup } from "../../types/service-group";
import type { ServiceType } from "../../types/service-type";
import type { Stylist } from "../../types/stylist";
import { miles, slotsFor, toMinutes } from "../../utils/availability";
import { money } from "../../utils/pricing";
import {
  formatDuration,
  getActiveServices,
  getFromWithFee,
  getGroupId,
} from "../../utils/services";
import type { FilterDraft, SearchState, SortKey, Venue } from "./search-state";

export interface Place {
  name: string;
  lat: number;
  lng: number;
  current?: boolean;
}

const CITY_CENTRE: Place = {
  name: "Manchester city centre",
  lat: 53.4808,
  lng: -2.2426,
};

/** The searched area; "Current location" (or blank) means the city centre. */
export const getPlace = (location: string): Place => {
  const city = searchLocations[0] || CITY_CENTRE;

  const needle = String(location || "")
    .trim()
    .toLowerCase();

  if (!needle || needle === "current location")
    return { ...city, current: true };

  return (
    searchLocations.find(({ name }) => name.toLowerCase() === needle) ||
    searchLocations.find(({ name }) => name.toLowerCase().includes(needle)) ||
    city
  );
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

/** [from, to, isCustom] in minutes for the chosen time of day, or null for any time. */
export const getTimeBand = ({
  time,
  customFrom,
  customTo,
}: SearchState): [number, number, boolean?] | null => {
  if (time === "morning") return [0, 720];

  if (time === "afternoon") return [720, 1080];

  if (time === "evening") return [1080, 1440];

  if (time === "custom")
    return [toDayMinutes(customFrom), toDayMinutes(customTo), true];

  return null;
};

export interface Slot {
  date: Date;
  time: string;
}

/** First slot on the chosen date (or within 28 days) that fits the time band. */
export const getFirstSlot = (
  stylist: Stylist,
  durationMinutes: number,
  date: string,
  band: ReturnType<typeof getTimeBand>,
): Slot | null => {
  const fits = (time: string) => {
    if (!band) return true;

    const minutes = toMinutes(time);

    return (
      minutes >= band[0] &&
      (band[2] ? minutes + durationMinutes <= band[1] : minutes < band[1])
    );
  };

  const startDay = date ? new Date(`${date}T00:00:00`) : new Date();

  startDay.setHours(0, 0, 0, 0);

  for (let offset = 0; offset < (date ? 1 : 28); offset++) {
    const day = new Date(startDay);

    day.setDate(startDay.getDate() + offset);
    const time = slotsFor(stylist, day, durationMinutes).find(fits);

    if (time) return { date: day, time };
  }

  return null;
};

export interface ResultEntry {
  stylist: Stylist;
  match: Service[];
  distance: number;
  nextSlot: Slot | null;
  price: number;
}

const VENUE_TYPES: Record<Venue, string[]> = {
  Salon: ["shop", "chairRental"],
  "Home-based": ["homeBased"],
  Mobile: ["mobile"],
};

/** Filter + sort stylists for the current state, optionally with draft filters. */
export const getResults = (
  state: SearchState,
  overrides: Partial<FilterDraft> = {},
) => {
  const selection = getStyleSelection(state);
  const place = getPlace(state.query.location);
  const venues = overrides.venues || state.venues;

  const maxPrice =
    "maxPrice" in overrides ? (overrides.maxPrice ?? null) : state.maxPrice;

  const sort: SortKey = overrides.sort || state.sort;
  const radius = overrides.radius || state.radius;

  const venueTypes = venues.length
    ? venues.flatMap((venue) => VENUE_TYPES[venue] || [])
    : null;

  const needle = selection.freeText.toLowerCase();
  const band = getTimeBand(state);
  const list: ResultEntry[] = [];

  stylists.forEach((stylist) => {
    const active = getActiveServices(stylist);

    if (!active.length) return;

    let match = active;

    if (selection.serviceType)
      match = active.filter(
        ({ serviceTypeId }) => serviceTypeId === selection.serviceType?.id,
      );
    else if (selection.isGroup)
      match = active.filter(
        (service) => getGroupId(service) === selection.group?.id,
      );
    else if (needle) {
      const named = active.filter(({ name }) =>
        name.toLowerCase().includes(needle),
      );

      if (named.length) match = named;
      else match = stylist.name.toLowerCase().includes(needle) ? active : [];
    }

    if (!match.length) return;

    if (venueTypes && !venueTypes.includes(stylist.businessType)) return;

    const distance = miles(place.lat, place.lng, stylist.lat, stylist.lng);

    if (stylist.businessType === "mobile") {
      if (distance > (stylist.travelMiles || 0)) return;
    } else if (distance > radius) return;

    const next = getFirstSlot(
      stylist,
      Math.min(...match.map(({ minutes }) => minutes)),
      state.query.date,
      band,
    );

    if ((state.query.date || state.time !== "any") && !next) return;

    const price = Math.min(...match.map(getFromWithFee));

    if (maxPrice != null && price > maxPrice) return;

    list.push({ stylist, match, distance, nextSlot: next, price });
  });

  const getStart = ({ nextSlot }: ResultEntry) =>
    nextSlot
      ? nextSlot.date.getTime() + toMinutes(nextSlot.time) * 6e4
      : Infinity;

  // mobile stylists travel to you, so they count as 0 miles
  const getDistance = ({ stylist, distance }: ResultEntry) =>
    stylist.businessType === "mobile" ? 0 : distance;

  const comparators: Record<
    SortKey,
    (left: ResultEntry, right: ResultEntry) => number
  > = {
    distance: (left, right) =>
      getDistance(left) - getDistance(right) || left.distance - right.distance,
    earliest: (left, right) =>
      getStart(left) - getStart(right) ||
      getDistance(left) - getDistance(right),
    price: (left, right) =>
      left.price - right.price || getDistance(left) - getDistance(right),
    "price-desc": (left, right) =>
      right.price - left.price || getDistance(left) - getDistance(right),
  };

  list.sort(comparators[sort] || comparators.distance);

  return { list, selection, place };
};

/** "Today" / "Tomorrow" / "Mon 12 Oct". */
export const formatDay = (date: Date): string => {
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  const days = Math.round((date.getTime() - today.getTime()) / 864e5);

  if (days === 0) return "Today";

  if (days === 1) return "Tomorrow";

  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

const getDistanceText = (
  businessType: Stylist["businessType"],
  distance: number,
  milesText: string,
): string => {
  if (businessType === "mobile") return "Travels to you";

  if (distance < 1) return "Under 1 mile away";

  return milesText + (milesText === "1" ? " mile away" : " miles away");
};

/** StylistCard props for each result. */
export const getResultCards = (
  list: ResultEntry[],
  selection: StyleSelection,
) =>
  list.map(({ stylist, match, distance, nextSlot, price }) => {
    const milesText = distance.toFixed(1).replace(/\.0$/, "");

    return {
      ...stylist,
      key: stylist.id,
      href: `/stylist?stylist=${stylist.id}`,
      services: [],
      from: price,
      meta: `From ${money(price)}`,
      rows: selection.has
        ? match.slice(0, 2).map((service) => {
            const fromPrice = money(getFromWithFee(service));
            const duration = formatDuration(service.minutes);
            const serviceParam = encodeURIComponent(service.id);

            return {
              name: service.name,
              meta: `from ${fromPrice} · ${duration}`,
              href: `/book?stylist=${stylist.id}&service=${serviceParam}`,
            };
          })
        : [],
      facts: [
        {
          text: getDistanceText(stylist.businessType, distance, milesText),
        },
        nextSlot
          ? {
              text: `Next available: ${formatDay(nextSlot.date)} ${nextSlot.time}`,
              strong: true,
            }
          : null,
      ].filter((fact): fact is { text: string; strong?: boolean } => !!fact),
    };
  });
