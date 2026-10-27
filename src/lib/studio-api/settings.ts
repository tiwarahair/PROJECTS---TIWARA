// The business and its settings: details, hours, time off, rules, payment policy, notifications, booking link,
// tax details, Stripe, the calendar feed, and closing or reopening.
import type { TaxDetails } from "../../components/tax-details-form/logic";
import type { TablesInsert, TablesUpdate } from "../../types/database";
import { supabase } from "../supabase";
import { check, invokeStudio, write, writeOrRefuse } from "./request";

export const updateStylist = (id: string, patch: TablesUpdate<"stylists">) =>
  write(supabase.from("stylists").update(patch).eq("id", id));

export const updateStylistAddress = (
  stylistId: string,
  patch: TablesUpdate<"stylist_private">,
) =>
  write(
    supabase.from("stylist_private").update(patch).eq("stylist_id", stylistId),
  );

export const saveHours = (rows: TablesInsert<"working_hours">[]) =>
  write(supabase.from("working_hours").upsert(rows));

export const saveBlock = (row: TablesInsert<"time_blocks">) =>
  write(supabase.from("time_blocks").upsert(row));

export const removeBlock = (id: string) =>
  write(supabase.from("time_blocks").delete().eq("id", id));

export const saveClosedPeriod = (row: TablesInsert<"closed_periods">) =>
  write(supabase.from("closed_periods").upsert(row));

export const removeClosedPeriod = (id: string) =>
  write(supabase.from("closed_periods").delete().eq("id", id));

export const saveBookingRules = (row: TablesInsert<"booking_rules">) =>
  write(supabase.from("booking_rules").upsert(row));

/** Policies are history: each save adds the new current one. */
export const addPaymentPolicy = (row: TablesInsert<"payment_policies">) =>
  write(supabase.from("payment_policies").insert(row));

export const saveNotificationPreference = (
  row: TablesInsert<"notification_preferences">,
) => check(supabase.from("notification_preferences").upsert(row));

export const isSlugFree = (slug: string, stylistId: string) =>
  check(
    supabase.rpc("is_slug_free", { candidate: slug, for_stylist: stylistId }),
  );

const toFeedUrl = (feedKey: string | null | undefined) => {
  if (!feedKey) throw new Error("no_calendar_feed");

  return `${window.location.origin}/cal/studio/${feedKey}.ics`;
};

export const fetchCalendarFeedUrl = async (stylistId: string) => {
  const row = await check(
    supabase
      .from("stylist_private")
      .select("calendar_feed_key")
      .eq("stylist_id", stylistId)
      .single(),
  );

  return toFeedUrl(row?.calendar_feed_key);
};

export const resetCalendarFeed = async (stylistId: string) =>
  toFeedUrl(
    await check(
      supabase.rpc("reset_calendar_feed", { target_stylist: stylistId }),
    ),
  );

/** Returns the new slug; throws with the server's reason (taken, reserved, 30-day limit). */
export const changeSlug = (slug: string) =>
  write(supabase.rpc("change_slug", { new_slug: slug }));

/** Saves through the Edge Function (it encrypts the NI number); returns the saved number's masked hint. */
export const saveTaxDetails = async (details: TaxDetails) => {
  const data = await invokeStudio<{ nationalInsuranceHint: string | null }>(
    "save-tax-details",
    details,
  );

  return data?.nationalInsuranceHint ?? "";
};

/** Stripe Connect: an onboarding or dashboard link, or the account's refreshed status. */
export interface StripeAccountState {
  url?: string;
  stripe_account_id?: string | null;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  stripe_requirements?: string;
  payout_bank?: string | null;
}

export const callStripe = async (action: "onboard" | "dashboard" | "refresh") =>
  (await invokeStudio<StripeAccountState>("stripe-connect", { action })) ?? {};

export const closeBusiness = () =>
  writeOrRefuse(supabase.rpc("close_business"), {
    has_upcoming:
      "You still have upcoming bookings. Cancel or finish them before closing.",
    has_dispute:
      "A client’s dispute is still open. You can close once their bank decides.",
    has_debt: "Pay what you owe in dispute fees to close your business.",
  });

export const reopenBusiness = () => write(supabase.rpc("reopen_business"));
