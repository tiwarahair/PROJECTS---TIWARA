import type { Stylist, ServiceCategoryKey } from "../types/domain";

export interface StylistFilter {
  style: ServiceCategoryKey | "";
  location: string;
}

/* Case-insensitive substring match on city; an empty filter matches everything. */
export function filterStylists(
  stylists: readonly Stylist[],
  { style, location }: StylistFilter,
): Stylist[] {
  const city = location.toLowerCase().trim();

  return stylists.filter(({ tags, city: stylistCity }) => {
    const matchesStyle = !style || tags.includes(style);
    const matchesCity = !city || stylistCity.toLowerCase().includes(city);
    return matchesStyle && matchesCity;
  });
}

/* "1 stylist" / "4 stylists" — the count label above the results grid. */
export function stylistCountLabel(count: number): string {
  return `${count} stylist${count === 1 ? "" : "s"}`;
}
