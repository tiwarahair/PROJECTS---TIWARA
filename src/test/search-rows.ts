import type { SearchArgs, SearchRow } from "../lib/search-api";

const row = (slug: string, name: string, fromPence: number): SearchRow => ({
  id: `${slug}-id`,
  slug,
  business_name: name,
  area_label: "Manchester",
  business_type: "shop",
  cover_path: null,
  distance_miles: 1.4,
  from_pence: fromPence,
  next_start: "2026-10-16T09:00:00Z",
  matches: [
    {
      id: `${slug}-service`,
      name: "Silk press",
      from_pence: fromPence,
      minutes: 90,
    },
  ],
  total_count: 0,
});

const ALL = [
  row("naturallynia", "NaturallyNia", 3095),
  row("locd-and-lovely", "Loc'd & Lovely", 4500),
];

/** A stand-in for search_stylists: locs → one stylist, a price limit under £30 → none. */
export const fakeSearch = async (args: SearchArgs) => {
  let rows = ALL;

  if (args.service_group === "locs") rows = ALL.slice(1);

  if (args.max_price_pence != null && args.max_price_pence < 3000) rows = [];

  return rows.map((item) => ({ ...item, total_count: rows.length }));
};
