import type { StylistStudio } from "../lib/studio-api";
import type { StudioSeed } from "../features/studio/core/use-studio";
import { getClientRow, getRow } from "./studio-booking-row";

const STYLIST_ID = "stylist-1";

const getHours = () =>
  [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    stylist_id: STYLIST_ID,
    weekday,
    is_open: weekday < 6,
    start_time: "09:00:00",
    end_time: "18:00:00",
  }));

/** A signed-in stylist's studio as the database returns it: one category with a silk press and a trim add-on, a 20% deposit policy. */
export const getStudioRow = (
  patch: Partial<StylistStudio> = {},
): StylistStudio => ({
  id: STYLIST_ID,
  owner_id: "owner-1",
  slug: "amara-hair",
  slug_changed_at: null,
  status: "live",
  business_name: "Amara Hair",
  business_type: "shop",
  bio: "Silk press and braids in Ancoats.",
  area_label: "Ancoats",
  avatar_path: null,
  cover_path: null,
  website: null,
  instagram: null,
  tiktok: null,
  youtube: null,
  contact_email: "hello@amara.hair",
  contact_phone: "07700900418",
  travel_radius_miles: null,
  vat_registered: false,
  vat_number: null,
  location: null,
  referral_source: null,
  partner_terms_accepted_at: "2026-01-01T10:00:00+00:00",
  partner_terms_version: "1",
  created_at: "2026-01-01T10:00:00+00:00",
  closed_at: null,
  pause_on: false,
  pause_until: null,
  availability_confirmed_at: null,
  profile_confirmed_at: null,
  stripe_account_id: null,
  stripe_requirements: "none",
  stripe_synced_at: null,
  charges_enabled: false,
  payouts_enabled: false,
  details_submitted: false,
  payout_bank: null,
  stylist_private: {
    stylist_id: STYLIST_ID,
    line1: "14 Blossom Street",
    line2: null,
    calendar_feed_key: "feed-key",
    city: "Manchester",
    postcode: "M4 6AJ",
    activity_seen_at: null,
  },
  stylist_categories: [
    {
      id: "category-1",
      stylist_id: STYLIST_ID,
      name: "Natural hair",
      sort: 0,
      colour: null,
      service_group_id: null,
    },
  ],
  services: [
    {
      id: "s-1",
      stylist_id: STYLIST_ID,
      service_type_id: "silk-press",
      service_group_id: "natural",
      category_id: "category-1",
      name: "Silk press",
      description: "Smooth, glossy and long-lasting.",
      price_pence: 6500,
      duration_min: 90,
      extra_time_min: null,
      status: "active",
      sizes_on: false,
      lengths_on: false,
      sort: 0,
      service_variations: [],
      service_addons: [
        {
          service_id: "s-1",
          addon_id: "addon-1",
          price_override_pence: null,
          minutes_override: null,
        },
      ],
    },
  ],
  addons: [
    {
      id: "addon-1",
      stylist_id: STYLIST_ID,
      category_id: "category-1",
      service_group_id: "natural",
      name: "Trim",
      price_pence: 1000,
      minutes: 15,
      status: "active",
      created_at: "2026-01-01T10:00:00+00:00",
    },
  ],
  working_hours: getHours(),
  time_blocks: [],
  closed_periods: [],
  booking_rules: null,
  payment_policies: [
    {
      id: "policy-1",
      stylist_id: STYLIST_ID,
      created_at: "2026-01-01T10:00:00+00:00",
      mode: "deposit",
      deposit_percent: 20,
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
    },
  ],
  portfolio_photos: [],
  notification_preferences: [],
  stylist_tax_details: null,
  ...patch,
});

/** What Studio opens with for a real account: Amara, Nia's upcoming silk press and one finished visit, and Kemi (blocked). */
export const getStudioSeed = (patch: Partial<StudioSeed> = {}): StudioSeed => ({
  owner: {
    first: "Amara",
    last: "Okonkwo",
    name: "Amara Okonkwo",
    area: "Ancoats",
    email: "amara@example.com",
    phone: "07700900418",
  },
  studio: getStudioRow(),
  bookings: {
    active: [getRow({})],
    past: [
      getRow({
        id: "b-past",
        ref: "TH-PAST01",
        status: "completed",
        starts_at: "2026-09-01T13:30:00+00:00",
        past_at: "2026-09-01T15:00:00+00:00",
      }),
    ],
    pastCursor: null,
    clients: [
      getClientRow({}),
      getClientRow({
        id: "client-kemi",
        first: "Kemi",
        last: "Adeyemi",
        phone: "07700900655",
        email: "kemi@example.com",
        blocked: true,
        upcoming: 0,
      }),
    ],
  },
  devices: [],
  ...patch,
});

/** A stylist who hasn't had a booking yet. */
export const getNewStudioSeed = () =>
  getStudioSeed({
    bookings: { active: [], past: [], pastCursor: null, clients: [] },
  });
