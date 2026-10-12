// Filter helpers shared by the desktop filter bar and the mobile filters sheet (prototype renderVals filters).
import type { SortKey, Venue } from "./search-state";

export const VENUES: Venue[] = ["Salon", "Home-based", "Mobile"];
export const SORTS: [SortKey, string][] = [
  ["distance", "Distance"],
  ["earliest", "Earliest available"],
  ["price", "Price: low to high"],
  ["price-desc", "Price: high to low"],
];

export const toggleVenue = (list: Venue[], venue: Venue): Venue[] =>
  list.includes(venue)
    ? list.filter((item) => item !== venue)
    : [...list, venue];

/** "£80" or "£250+" for no limit. */
export const formatMaxPrice = (value: number | null): string =>
  value == null ? "£250+" : `£${value}`;

/** Slider value → max price; the top of the range means no limit. */
export const toMaxPrice = (value: string): number | null =>
  Number(value) >= 250 ? null : Number(value);

export const getPriceFill = (value: number | null): string =>
  `${((value == null ? 250 : value) / 250) * 100}%`;
