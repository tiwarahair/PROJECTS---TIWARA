import type { ServiceId } from "../types/services";
import type { Stylist } from "../types/stylist";

export interface StylistFilter {
  style: ServiceId | "";
  location: string;
}

/* Case-insensitive substring match on city; an empty filter matches everything. */
export function filterStylists(
  stylists: readonly Stylist[],
  { style, location }: StylistFilter,
): Stylist[] {
  const city = location.toLowerCase().trim();

  return stylists.filter(({ services, location: stylistLocation }) => {
    const serviceIds = Object.keys(services);
    const matchesStyle = !style || serviceIds.includes(style);
    const matchesCity = !city || stylistLocation.toLowerCase().includes(city);
    return matchesStyle && matchesCity;
  });
}

/* "1 stylist" / "4 stylists" — the count label above the results grid. */
export function stylistCountLabel(count: number): string {
  return `${count} stylist${count === 1 ? "" : "s"}`;
}
