// Parts of prototype Search baseVals that renderVals overrides or the template never renders: the original service
// picker, day/category/venue chips, time options, location list and the first results/suggestions logic.
// Not used by the current page — kept from the prototype until the final clean-up.
import {
  searchLocations,
  serviceGroups,
  serviceTypes,
  stylists,
} from "../../data";
import { miles } from "../../utils/availability";
import { money } from "../../utils/pricing";
import {
  formatDuration,
  getActiveServices,
  getFromWithFee,
  getGroupId,
  matchTypes,
} from "../../utils/services";
import { SEARCH_ICONS } from "./search-icons";
import { formatDay, getFirstSlot, getTimeBand } from "./search-logic";
import { TIMES } from "./search-dates";
import type { SearchState } from "./search-state";

const getLegacySelection = ({ q }: SearchState) => {
  const type = q.type ? serviceTypes.find(({ slug }) => slug === q.type) : null;
  const group = type
    ? serviceGroups.find(({ id }) => id === type.groupId)
    : q.group
      ? serviceGroups.find(({ slug }) => slug === q.group)
      : null;
  return {
    type: type || null,
    group: group || null,
    styleName: type ? type.name : group ? group.name : "",
  };
};

const getLegacyPlace = ({ q }: SearchState) => {
  const needle = String(q.loc || "").toLowerCase();
  const place = searchLocations.find(
    ({ name }) => name.toLowerCase() === needle,
  ) ||
    (needle && needle !== "current location" && needle !== "manchester"
      ? searchLocations.find(({ name }) => name.toLowerCase().includes(needle))
      : null) ||
    searchLocations[0] || {
      name: "Manchester city centre",
      lat: 53.4808,
      lng: -2.2426,
    };
  return {
    place,
    needle,
    locName: needle === "current location" ? "your location" : place.name,
  };
};

const LEGACY_VENUES: Record<string, string[] | null> = {
  All: null,
  Salon: ["shop", "chairRental"],
  "Home-based": ["homeBased"],
  Mobile: ["mobile"],
};

/** The first results list (single venue, mobile stylists last). */
export const getLegacyResults = (state: SearchState) => {
  const { type, group } = getLegacySelection(state);
  const { place } = getLegacyPlace(state);
  const band = getTimeBand(state);
  return stylists
    .map((stylist) => {
      const active = getActiveServices(stylist);
      const match = active.filter((service) =>
        type
          ? service.serviceTypeId === type.id
          : group
            ? getGroupId(service) === group.id
            : true,
      );
      if (!match.length) return null;
      const venueTypes = LEGACY_VENUES[state.venue];
      if (venueTypes && !venueTypes.includes(stylist.businessType)) return null;
      const distance = miles(place.lat, place.lng, stylist.lat, stylist.lng);
      if (distance > state.radius) return null;
      if (
        stylist.businessType === "mobile" &&
        distance > (stylist.travelMiles || 0)
      )
        return null;
      const next = getFirstSlot(
        stylist,
        Math.min(...match.map(({ mins }) => mins)),
        state.q.date,
        band,
      );
      if ((state.q.date || state.time !== "any") && !next) return null;
      const rowSource = [
        ...match,
        ...active.filter((service) => !match.includes(service)),
      ].slice(0, 2);
      const milesText = distance.toFixed(1).replace(/\.0$/, "");
      return {
        ...stylist,
        mi: distance,
        href: "/stylist?stylist=" + stylist.id,
        rows: rowSource.map((service) => ({
          name: service.name,
          meta:
            "from " +
            money(getFromWithFee(service)) +
            " · " +
            formatDuration(service.mins),
          href:
            "/book?stylist=" +
            stylist.id +
            "&service=" +
            encodeURIComponent(service.id),
        })),
        facts: [
          {
            text:
              distance < 1
                ? "Under 1 mile away"
                : milesText +
                  (milesText === "1" ? " mile away" : " miles away"),
          },
          next
            ? {
                text:
                  "Next available: " + formatDay(next.date) + " " + next.time,
                strong: true,
              }
            : null,
        ].filter(Boolean),
      };
    })
    .filter((result): result is NonNullable<typeof result> => !!result)
    .sort(
      (left, right) =>
        Number(left.businessType === "mobile") -
          Number(right.businessType === "mobile") || left.mi - right.mi,
    );
};

/** The original service picker sections (search box + grouped types, own services fallback). */
export const getServicePicker = (state: SearchState) => {
  const query = state.pq.trim().toLowerCase();
  const visibleTypes = matchTypes(query).filter(({ isOther }) => !isOther);
  const sections: {
    key: string;
    title: string;
    rows: {
      key: string;
      label: string;
      icon?: string;
      sub?: string;
      isSelected: boolean;
      indent: boolean;
      href?: string;
      groupSlug?: string;
      typeSlug?: string;
    }[];
  }[] = [];
  if (!query)
    sections.push({
      key: "all",
      title: "All styles",
      rows: [
        {
          key: "any",
          label: "All services",
          icon: SEARCH_ICONS.grid,
          isSelected: !state.q.group && !state.q.type,
          indent: false,
          groupSlug: "",
        },
      ],
    });
  serviceGroups.forEach((group) => {
    const types = visibleTypes.filter(({ groupId }) => groupId === group.id);
    const groupHit = query && group.name.toLowerCase().includes(query);
    if (query && !types.length && !groupHit) return;
    sections.push({
      key: group.id,
      title: group.name,
      rows: [
        {
          key: "g",
          label: "All " + group.name,
          icon: SEARCH_ICONS[group.id] || SEARCH_ICONS.grid,
          isSelected: !state.q.type && state.q.group === group.slug,
          indent: false,
          groupSlug: group.slug,
        },
        ...types.map((type) => ({
          key: type.id,
          label: type.name,
          isSelected: state.q.type === type.slug,
          indent: true,
          typeSlug: type.slug,
        })),
      ],
    });
  });
  let isEmpty = false;
  if (query && !sections.length) {
    const own = stylists.flatMap((stylist) =>
      getActiveServices(stylist)
        .filter(({ name }) => name.toLowerCase().includes(query))
        .map((service) => ({ stylist, service })),
    );
    if (own.length)
      sections.push({
        key: "own",
        title: "Services called ‘" + state.pq.trim() + "’",
        rows: own.map(({ stylist, service }) => ({
          key: service.id,
          label: service.name,
          sub: stylist.name,
          isSelected: false,
          indent: false,
          href:
            "/book?stylist=" +
            stylist.id +
            "&service=" +
            encodeURIComponent(service.id),
        })),
      });
    else isEmpty = true;
  }
  return {
    q: state.pq,
    showLabel: !query,
    sections,
    isEmpty,
    emptyText:
      "No styles match ‘" +
      state.pq.trim() +
      "’. Try a broader term like braids or locs.",
  };
};

/** "Any day" + the next 21 days. */
export const getDayChips = () => {
  const today = new Date();
  return [
    { label: "Any day", value: "" },
    ...Array.from({ length: 21 }, (_, offset) => {
      const date = new Date(today);
      date.setDate(date.getDate() + offset);
      const label =
        offset === 0
          ? "Today"
          : offset === 1
            ? "Tomorrow"
            : date.toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
              });
      return { label, value: date.toISOString().slice(0, 10) };
    }),
  ];
};

export const getCategoryChips = (state: SearchState) =>
  ["braids", "locs", "natural"]
    .map((id) => serviceGroups.find((group) => group.id === id))
    .filter((group) => !!group)
    .map(({ name, slug }) => ({
      label: name,
      slug,
      isSelected: state.q.group === slug && !state.q.type,
    }));

export const getLegacyVenueChips = (state: SearchState) =>
  ["All", "Salon", "Home-based", "Mobile"].map((venue) => ({
    label: venue,
    isSelected: state.venue === venue,
  }));

export const getTimeOptions = (state: SearchState) =>
  TIMES.map(({ id, label, meta }) => ({
    id,
    label,
    meta,
    isSelected: state.draft === id,
  }));

export const getLegacyLocationList = (state: SearchState) => {
  const { place, needle } = getLegacyPlace(state);
  return searchLocations
    .filter(
      ({ name }) =>
        state.mob !== "location" ||
        !needle ||
        needle === "current location" ||
        name.toLowerCase().includes(needle),
    )
    .map(({ name }) => ({
      key: name,
      name,
      isSelected: place.name === name && needle !== "current location",
    }));
};

export const getLegacyCopy = (state: SearchState, count: number) => {
  const { styleName } = getLegacySelection(state);
  const { locName } = getLegacyPlace(state);
  return {
    resultLine:
      count +
      " stylist" +
      (count === 1 ? "" : "s") +
      (styleName ? " for " + styleName : "") +
      " near " +
      locName,
    emptyText:
      "No stylists" +
      (styleName ? " for " + styleName : "") +
      " near " +
      locName +
      (state.q.date || state.time !== "any"
        ? " at that time."
        : " within " + state.radius + " miles."),
    serviceLabel: styleName || "All services",
  };
};

export const getLegacySuggestions = (state: SearchState) => {
  const { type, group } = getLegacySelection(state);
  return [
    ...(state.q.date || state.time !== "any"
      ? [{ key: "d", label: "Try any date" }]
      : []),
    ...(state.radius < 15 ? [{ key: "r", label: "Widen to 15 miles" }] : []),
    ...(type && group ? [{ key: "g", label: "Try " + group.name }] : []),
  ];
};
