// A public profile → the Stylist shape the profile page shows, plus its hours and booking state.
import type { Tables } from "../types/database";
import type { Policy, PolicyFee } from "../types/policy";
import type { Stylist } from "../types/stylist";
import { formatMoney } from "../utils/money";
import { getFromWithFee } from "../utils/services";
import { bySort } from "../utils/sort";
import type { PublicProfile, WorkingHours } from "./public-profiles";
import { toService } from "./public-services";
import { getPhotoUrl } from "./studio-api";

export interface PublicStylist {
  stylist: Stylist;
  hours: WorkingHours[];
  nextStart: Date | null;
  isTakingBookings: boolean;
  socials: { instagram: string; tiktok: string };
}

const BUSINESS_TYPES: Record<string, Stylist["businessType"]> = {
  shop: "shop",
  chair_rental: "chairRental",
  home_based: "homeBased",
  mobile: "mobile",
};

// demo stylists (local seed) point at bundled assets instead of Storage
const toPhotoUrl = (path: string) =>
  path.startsWith("demo/") ? path : getPhotoUrl(path);

const toFee = (on: boolean, kind: string, percent: number): PolicyFee => ({
  on,
  kind: kind === "pct" ? "pct" : "keep",
  percent,
});

const toPolicy = (row: Tables<"payment_policies">): Policy => ({
  mode:
    row.mode === "deposit" || row.mode === "full" || row.mode === "card"
      ? row.mode
      : "none",
  depositPercent: row.deposit_percent,
  refundable: row.refundable,
  freeWindowHours: row.free_window_hours,
  late: toFee(row.late_on, row.late_kind, row.late_percent),
  noShow: toFee(row.no_show_on, row.no_show_kind, row.no_show_percent),
  graceMinutes: row.grace_minutes,
  extras: (Array.isArray(row.extras) ? row.extras : []).map((extra) => ({
    text:
      extra && typeof extra === "object" && !Array.isArray(extra)
        ? String(extra.text ?? "")
        : "",
  })),
});

const isTakingBookings = ({ status, pause_on, pause_until }: PublicProfile) =>
  status === "live" &&
  !(pause_on && (!pause_until || new Date(pause_until) > new Date()));

export const toPublicStylist = (profile: PublicProfile): PublicStylist => {
  const services = [...profile.services]
    .sort(bySort)
    .map((row) => toService(row, profile.addons));

  const fromFee = services.length
    ? Math.min(...services.map(getFromWithFee))
    : null;

  const area = profile.area_label ?? "";

  return {
    stylist: {
      id: profile.slug,
      site: profile.website ?? undefined,
      email: profile.contact_email ?? undefined,
      name: profile.business_name,
      area,
      businessType: BUSINESS_TYPES[profile.business_type] ?? "shop",
      travelMiles: profile.travel_radius_miles ?? undefined,
      mobile: profile.business_type === "mobile",
      verified: profile.status === "live",
      rating: 0,
      reviews: 0,
      bio: profile.bio ?? "",
      cover: profile.cover_path ? toPhotoUrl(profile.cover_path) : "",
      portfolio: [...profile.portfolio_photos]
        .sort(bySort)
        .map(({ path }) => toPhotoUrl(path)),
      policies: toPolicy(profile.payment_policy),
      categories: [...profile.stylist_categories]
        .sort(bySort)
        .map(({ id, name, sort, colour }) => ({
          id,
          name,
          sort,
          colour: colour ?? "",
        })),
      services,
      from: fromFee ?? 0,
      fromFee,
      fromLabel: fromFee == null ? "" : formatMoney(fromFee),
      // demo-only fields the profile doesn't show (location stays private)
      lat: 0,
      lng: 0,
      availability: {},
      groups: [],
      address: { line1: "", town: area, postcode: "" },
      addressFull: area,
      areaShort: area,
    },
    hours: [...profile.working_hours].sort(
      (left, right) => left.weekday - right.weekday,
    ),
    nextStart: profile.next_start ? new Date(profile.next_start) : null,
    isTakingBookings: isTakingBookings(profile),
    socials: {
      instagram: profile.instagram ?? "",
      tiktok: profile.tiktok ?? "",
    },
  };
};
