import type { PublicProfile } from "../lib/public-profiles";

const STYLIST_ID = "stylist-1";

const hours = (
  weekday: number,
  isOpen: boolean,
  start: string,
  end: string,
) => ({
  stylist_id: STYLIST_ID,
  weekday,
  is_open: isOpen,
  start_time: `${start}:00`,
  end_time: `${end}:00`,
});

const service = (
  id: string,
  name: string,
  pricePence: number,
  sort: number,
) => ({
  id,
  stylist_id: STYLIST_ID,
  service_type_id: "knotless-braids",
  service_group_id: "braids",
  category_id: "category-1",
  name,
  description: "Hair included",
  price_pence: pricePence,
  duration_min: 240,
  extra_time_min: null,
  status: "active",
  sort,
  sizes_on: false,
  lengths_on: false,
  service_variations: [],
  service_addons: [],
});

/** get_stylist_profile for a live shop open Mon–Fri 10–20 and Sat 9–18. */
export const PUBLIC_PROFILE: PublicProfile = {
  slug: "tiwaras-house",
  business_name: "Tiwára's House",
  business_type: "shop",
  bio: "Protective styles that last.",
  area_label: "Ancoats, Manchester",
  travel_radius_miles: null,
  contact_email: null,
  instagram: "@tiwarashouse",
  tiktok: null,
  website: "tiwarashouse.com",
  cover_path: "demo/stylists/w160944.jpg",
  status: "live",
  pause_on: false,
  pause_until: null,
  next_start: "2026-10-06T09:00:00Z",
  stylist_categories: [
    {
      id: "category-1",
      stylist_id: STYLIST_ID,
      service_group_id: "braids",
      name: "Braids",
      sort: 0,
      colour: null,
    },
  ],
  services: [
    service("service-1", "Knotless braids", 13000, 0),
    service("service-2", "Box braids", 11000, 1),
  ],
  addons: [],
  working_hours: [
    ...[0, 1, 2, 3, 4].map((weekday) => hours(weekday, true, "10:00", "20:00")),
    hours(5, true, "09:00", "18:00"),
    hours(6, false, "09:00", "18:00"),
  ],
  payment_policy: {
    id: "policy-1",
    stylist_id: STYLIST_ID,
    mode: "none",
    deposit_percent: 0,
    refundable: true,
    free_window_hours: 48,
    grace_minutes: 0,
    late_on: false,
    late_kind: "keep",
    late_percent: 50,
    no_show_on: false,
    no_show_kind: "keep",
    no_show_percent: 50,
    extras: [],
    created_at: "",
  },
  portfolio_photos: [
    {
      id: "photo-1",
      stylist_id: STYLIST_ID,
      path: "demo/portfolio/w161156.jpg",
      sort: 0,
      created_at: "",
    },
    {
      id: "photo-2",
      stylist_id: STYLIST_ID,
      path: "demo/stylists/w161154.jpg",
      sort: 1,
      created_at: "",
    },
  ],
};
