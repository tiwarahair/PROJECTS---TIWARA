// Search results logic, ported from prototype Search.dc.html (place, styleSel, band, firstSlot, calc, results).
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
export const getPlace = (loc: string): Place => {
  const city = searchLocations[0] || CITY_CENTRE;
  const needle = String(loc || "")
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
  ty: ServiceType | null;
  gr: ServiceGroup | null;
  isGroup: boolean;
  qq: string;
  name: string;
  display: string;
  has: boolean;
}

export const getStyleSelection = ({ q }: SearchState): StyleSelection => {
  const ty = q.type
    ? serviceTypes.find(({ slug }) => slug === q.type) || null
    : null;
  const gr = ty
    ? serviceGroups.find(({ id }) => id === ty.groupId)
    : q.group
      ? serviceGroups.find(({ slug }) => slug === q.group)
      : null;
  const qq = !ty && !gr ? String(q.qq || "").trim() : "";
  return {
    ty,
    gr: gr || null,
    isGroup: !ty && !!gr,
    qq,
    name: ty ? ty.name : gr ? gr.name : qq ? "‘" + qq + "’" : "",
    display: ty ? ty.name : gr ? gr.name : qq,
    has: !!(ty || gr || qq),
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
  cFrom,
  cTo,
}: SearchState): [number, number, boolean?] | null => {
  if (time === "morning") return [0, 720];
  if (time === "afternoon") return [720, 1080];
  if (time === "evening") return [1080, 1440];
  if (time === "custom") return [toDayMinutes(cFrom), toDayMinutes(cTo), true];
  return null;
};

export interface Slot {
  date: Date;
  time: string;
}

/** First slot on the chosen date (or within 28 days) that fits the time band. */
export const getFirstSlot = (
  stylist: Stylist,
  mins: number,
  date: string,
  band: ReturnType<typeof getTimeBand>,
): Slot | null => {
  const fits = (time: string) => {
    if (!band) return true;
    const minutes = toMinutes(time);
    return (
      minutes >= band[0] &&
      (band[2] ? minutes + mins <= band[1] : minutes < band[1])
    );
  };
  const startDay = date ? new Date(date + "T00:00:00") : new Date();
  startDay.setHours(0, 0, 0, 0);
  for (let offset = 0; offset < (date ? 1 : 28); offset++) {
    const day = new Date(startDay);
    day.setDate(startDay.getDate() + offset);
    const time = slotsFor(stylist, day, mins).find(fits);
    if (time) return { date: day, time };
  }
  return null;
};

export interface ResultEntry {
  st: Stylist;
  match: Service[];
  mi: number;
  nx: Slot | null;
  price: number;
}

const VENUE_TYPES: Record<Venue, string[]> = {
  Salon: ["shop", "chairRental"],
  "Home-based": ["homeBased"],
  Mobile: ["mobile"],
};

/** Filter + sort stylists for the current state, optionally with draft filters (prototype calc). */
export const calcResults = (
  state: SearchState,
  overrides: Partial<FilterDraft> = {},
) => {
  const selection = getStyleSelection(state);
  const place = getPlace(state.q.loc);
  const venues = overrides.venues || state.venues;
  const maxPrice =
    "maxPrice" in overrides ? (overrides.maxPrice ?? null) : state.maxPrice;
  const sort: SortKey = overrides.sort || state.sort;
  const radius = overrides.radius || state.radius;
  const venueTypes = venues.length
    ? venues.flatMap((venue) => VENUE_TYPES[venue] || [])
    : null;
  const needle = selection.qq.toLowerCase();
  const band = getTimeBand(state);
  const list: ResultEntry[] = [];
  stylists.forEach((stylist) => {
    const active = getActiveServices(stylist);
    if (!active.length) return;
    let match = active;
    if (selection.ty)
      match = active.filter(
        ({ serviceTypeId }) => serviceTypeId === selection.ty?.id,
      );
    else if (selection.isGroup)
      match = active.filter(
        (service) => getGroupId(service) === selection.gr?.id,
      );
    else if (needle) {
      const named = active.filter(({ name }) =>
        name.toLowerCase().includes(needle),
      );
      match = named.length
        ? named
        : stylist.name.toLowerCase().includes(needle)
          ? active
          : [];
    }
    if (!match.length) return;
    if (venueTypes && !venueTypes.includes(stylist.businessType)) return;
    const distance = miles(place.lat, place.lng, stylist.lat, stylist.lng);
    if (stylist.businessType === "mobile") {
      if (distance > (stylist.travelMiles || 0)) return;
    } else if (distance > radius) return;
    const next = getFirstSlot(
      stylist,
      Math.min(...match.map(({ mins }) => mins)),
      state.q.date,
      band,
    );
    if ((state.q.date || state.time !== "any") && !next) return;
    const price = Math.min(...match.map(getFromWithFee));
    if (maxPrice != null && price > maxPrice) return;
    list.push({ st: stylist, match, mi: distance, nx: next, price });
  });
  const getStart = ({ nx }: ResultEntry) =>
    nx ? nx.date.getTime() + toMinutes(nx.time) * 6e4 : Infinity;
  // mobile stylists travel to you, so they count as 0 miles
  const getDistance = ({ st, mi }: ResultEntry) =>
    st.businessType === "mobile" ? 0 : mi;
  const comparators: Record<
    SortKey,
    (left: ResultEntry, right: ResultEntry) => number
  > = {
    distance: (left, right) =>
      getDistance(left) - getDistance(right) || left.mi - right.mi,
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
  return days === 0
    ? "Today"
    : days === 1
      ? "Tomorrow"
      : date.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
        });
};

/** StylistCard props for each result (prototype renderVals results). */
export const getResultCards = (
  list: ResultEntry[],
  selection: StyleSelection,
) =>
  list.map(({ st, match, mi, nx, price }) => {
    const milesText = mi.toFixed(1).replace(/\.0$/, "");
    return {
      ...st,
      key: st.id,
      href: "/stylist?stylist=" + st.id,
      services: [],
      from: price,
      meta: "From " + money(price),
      rows: selection.has
        ? match.slice(0, 2).map((service) => ({
            name: service.name,
            meta:
              "from " +
              money(getFromWithFee(service)) +
              " · " +
              formatDuration(service.mins),
            href:
              "/book?stylist=" +
              st.id +
              "&service=" +
              encodeURIComponent(service.id),
          }))
        : [],
      facts: [
        {
          text:
            st.businessType === "mobile"
              ? "Travels to you"
              : mi < 1
                ? "Under 1 mile away"
                : milesText +
                  (milesText === "1" ? " mile away" : " miles away"),
        },
        nx
          ? {
              text: "Next available: " + formatDay(nx.date) + " " + nx.time,
              strong: true,
            }
          : null,
      ].filter((fact): fact is { text: string; strong?: boolean } => !!fact),
    };
  });
