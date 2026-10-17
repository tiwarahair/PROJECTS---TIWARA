// Studio's reads and writes against Supabase (row shapes; studio-records converts them).
import type { TaxDetails } from "../components/tax-details-form/tax-details-logic";
import type { Tables, TablesInsert, TablesUpdate } from "../types/database";
import {
  UPLOAD_WIDTHS,
  isUploadOriginal,
  toUploadVariant,
} from "../utils/image-sources";
import { SaveError, notifyStudioWrite } from "./studio-writes";
import { supabase } from "./supabase";

const PHOTO_BUCKET = "stylist-photos";

const STUDIO_SELECT = `*,
  stylist_private(*),
  stylist_categories(*),
  services(*, service_variations(*), service_addons(*)),
  addons(*),
  working_hours(*),
  time_blocks(*),
  closed_periods(*),
  booking_rules(*),
  payment_policies(*),
  portfolio_photos(*),
  notification_preferences(event, email, sms),
  stylist_tax_details(kind, first_name, middle_name, last_name, legal_name, date_of_birth, ni_hint,
    company_name, company_number, is_address_same, line1, line2, city, postcode)`;

/** Everything Studio shows for the signed-in stylist, in one request. */
export const fetchStylistStudio = async (ownerId: string) => {
  const { data, error } = await supabase
    .from("stylists")
    .select(STUDIO_SELECT)
    .eq("owner_id", ownerId)
    .order("created_at", {
      referencedTable: "payment_policies",
      ascending: false,
    })
    .limit(1, { referencedTable: "payment_policies" })
    .single();

  if (error) throw error;

  return data;
};

export type StylistStudio = Awaited<ReturnType<typeof fetchStylistStudio>>;

/** The request's data (empty for functions that return nothing), or its error thrown. */
const check = async <T>(
  request: PromiseLike<{ data: T; error: Error | null }>,
) => {
  const { data, error } = await request;

  if (error) throw error;

  return data;
};

/** check() for a write: tells cached reads the data changed. */
const write = async <T>(
  request: PromiseLike<{ data: T; error: Error | null }>,
) => {
  const data = await check(request);

  notifyStudioWrite();

  return data;
};

export const getPhotoUrl = (path: string) =>
  supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;

/** The storage path inside a photo URL; null for anything else (previews, demo photos). */
export const getPhotoPath = (url: string) =>
  url.split(`/${PHOTO_BUCKET}/`)[1] ?? null;

let isWebpEncodable: boolean | null = null;

const canEncodeWebp = () => {
  if (isWebpEncodable !== null) return isWebpEncodable;

  try {
    isWebpEncodable = document
      .createElement("canvas")
      .toDataURL("image/webp")
      .startsWith("data:image/webp");
  } catch {
    // no canvas to try with: stick to JPEG
    isWebpEncodable = false;
  }

  return isWebpEncodable;
};

type CompressOptions = Parameters<
  typeof import("browser-image-compression").default
>[1];

// loaded on the first upload, once: most visitors never upload
let compressorImport: Promise<
  typeof import("browser-image-compression")
> | null = null;

const compress = async (file: File, options: CompressOptions) => {
  compressorImport ??= import("browser-image-compression").catch(
    (error: unknown) => {
      // a failed download is retried on the next upload
      compressorImport = null;
      throw error;
    },
  );

  const { default: imageCompression } = await compressorImport;

  return imageCompression(file, { useWebWorker: true, ...options });
};

// names are unique per upload, so browsers and the CDN can keep a file for a year
const putFile = async (path: string, file: Blob, contentType: string) => {
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType,
      cacheControl: "31536000",
    });

  if (error) throw error;
};

/** Resizes in the browser (long side 2000px for covers and portfolio, 600px for avatars), then uploads. */
export const uploadPhoto = async (path: string, file: File, maxSide = 2000) => {
  const resized = await compress(file, {
    maxWidthOrHeight: maxSide,
    maxSizeMB: 1.5,
    fileType: "image/jpeg",
  });

  await putFile(path, resized, "image/jpeg");

  return path;
};

/** uploadPhoto, plus WebP and JPEG copies at UPLOAD_WIDTHS beside it for srcset; `path` ends "-full.jpg". */
export const uploadPhotoWithCopies = async (path: string, file: File) => {
  await uploadPhoto(path, file);

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  bitmap.close();

  // the compressor sizes by the long side: convert each width to it
  const longSidePerWidth = Math.max(width, height) / width;

  const copies = UPLOAD_WIDTHS.map(async (copyWidth) => {
    const maxWidthOrHeight = Math.round(
      Math.min(copyWidth, width) * longSidePerWidth,
    );

    const jpeg = await compress(file, {
      maxWidthOrHeight,
      maxSizeMB: 1,
      fileType: "image/jpeg",
    });

    // a browser that can't encode WebP (Safari) stores the JPEG under the .webp name, so that source still loads
    const webp = canEncodeWebp()
      ? await compress(file, {
          maxWidthOrHeight,
          maxSizeMB: 1,
          fileType: "image/webp",
        })
      : jpeg;

    await Promise.all([
      putFile(toUploadVariant(path, copyWidth, "jpg"), jpeg, "image/jpeg"),
      putFile(toUploadVariant(path, copyWidth, "webp"), webp, webp.type),
    ]);
  });

  await Promise.all(copies);

  return path;
};

/** Deletes a photo and, for one with copies, the copies too. */
export const removePhoto = (path: string) =>
  check(
    supabase.storage
      .from(PHOTO_BUCKET)
      .remove(
        isUploadOriginal(path)
          ? [
              path,
              ...UPLOAD_WIDTHS.flatMap((copyWidth) => [
                toUploadVariant(path, copyWidth, "webp"),
                toUploadVariant(path, copyWidth, "jpg"),
              ]),
            ]
          : [path],
      ),
  );

export const updateStylist = (id: string, patch: TablesUpdate<"stylists">) =>
  write(supabase.from("stylists").update(patch).eq("id", id));

export const updateStylistAddress = (
  stylistId: string,
  patch: TablesUpdate<"stylist_private">,
) =>
  write(
    supabase.from("stylist_private").update(patch).eq("stylist_id", stylistId),
  );

export const saveCategories = (rows: TablesInsert<"stylist_categories">[]) =>
  write(supabase.from("stylist_categories").upsert(rows));

export const removeCategory = (id: string) =>
  write(supabase.from("stylist_categories").delete().eq("id", id));

/** A service and its sizes / lengths / own options / add-on links, replaced as a whole. */
export const saveService = async (
  service: TablesInsert<"services">,
  variations: TablesInsert<"service_variations">[],
  addonLinks: TablesInsert<"service_addons">[],
) => {
  const serviceId = service.id ?? "";

  // even a half-finished save has changed the menu
  try {
    await check(supabase.from("services").upsert(service));

    await check(
      supabase.from("service_variations").delete().eq("service_id", serviceId),
    );

    await check(
      supabase.from("service_addons").delete().eq("service_id", serviceId),
    );

    if (variations.length)
      await check(supabase.from("service_variations").insert(variations));

    if (addonLinks.length)
      await check(supabase.from("service_addons").insert(addonLinks));
  } finally {
    notifyStudioWrite();
  }
};

export const saveServiceStatus = (id: string, status: string) =>
  write(supabase.from("services").update({ status }).eq("id", id));

export const removeService = (id: string) =>
  write(supabase.from("services").delete().eq("id", id));

export const saveAddon = (row: TablesInsert<"addons">) =>
  write(supabase.from("addons").upsert(row));

export const removeAddon = (id: string) =>
  write(supabase.from("addons").delete().eq("id", id));

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

export const addPortfolioPhoto = (row: TablesInsert<"portfolio_photos">) =>
  write(supabase.from("portfolio_photos").insert(row));

export const removePortfolioPhoto = (id: string) =>
  write(supabase.from("portfolio_photos").delete().eq("id", id));

export const isSlugFree = (slug: string, stylistId: string) =>
  check(
    supabase.rpc("is_slug_free", { candidate: slug, for_stylist: stylistId }),
  );

/** Returns the new slug; throws with the server's reason (taken, reserved, 30-day limit). */
export const changeSlug = (slug: string) =>
  write(supabase.rpc("change_slug", { new_slug: slug }));

/** Saves through the Edge Function (it encrypts the NI number); returns the saved number's masked hint. */
export const saveTaxDetails = async (details: TaxDetails) => {
  const { data, error } = await supabase.functions.invoke<{
    nationalInsuranceHint: string | null;
  }>("save-tax-details", { body: details });

  if (error) throw error;

  notifyStudioWrite();

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

export const callStripe = async (
  action: "onboard" | "dashboard" | "refresh",
) => {
  const { data, error } = await supabase.functions.invoke<StripeAccountState>(
    "stripe-connect",
    { body: { action } },
  );

  if (error) throw error;

  notifyStudioWrite();

  return data ?? {};
};

const BOOKING_SELECT = `id, status, starts_at, minutes, price_pence, snapshot, contact, notes, address, terms,
  reschedule_count, cancelled_at, cancelled_by, cancellation, no_show_at, overlap_ok`;

/** Studio's bookings from `fromDate` on (anything still being paid for is left out). */
export const fetchStudioBookings = async (
  stylistId: string,
  fromDate: string,
) => {
  const rows = await check(
    supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("stylist_id", stylistId)
      .gte("starts_at", fromDate)
      .not("status", "in", "(held,expired)")
      .order("starts_at"),
  );

  return rows ?? [];
};

export type StudioBookingRow = Awaited<
  ReturnType<typeof fetchStudioBookings>
>[number];

export const setBookingStatus = (id: string, status: "arrived" | "confirmed") =>
  write(
    supabase.rpc("set_booking_status", { target: id, next_status: status }),
  );

export const markNoShow = (id: string, isChargingFee: boolean) =>
  write(
    supabase.rpc("mark_no_show", { target: id, charge_fee: isChargingFee }),
  );

export const undoNoShow = (id: string) =>
  write(supabase.rpc("undo_no_show", { target: id }));

export const rescheduleStudioBooking = async (
  id: string,
  startsAt: string,
  allowOverlap: boolean,
) => {
  const { error } = await supabase.rpc("reschedule_studio_booking", {
    target: id,
    slot_start: startsAt,
    allow_overlap: allowOverlap,
  });

  if (error?.message === "slot_taken")
    throw new SaveError("That time was just booked. Pick another time.");

  if (error) throw error;

  notifyStudioWrite();
};

export interface StudioCancel {
  bookingId: string;
  who: "stylist" | "client";
  waiveFee: boolean;
  reason: string;
}

/** Cancels through the Edge Function, which refunds the client first. */
export const cancelStudioBooking = async (cancel: StudioCancel) => {
  const { error } = await supabase.functions.invoke("studio-booking-cancel", {
    body: cancel,
  });

  if (error) throw error;

  notifyStudioWrite();
};

/** Takes the booking page offline; it can be reopened for 15 days. */
export const closeBusiness = () => write(supabase.rpc("close_business"));

export const reopenBusiness = () => write(supabase.rpc("reopen_business"));

export type ServiceRow = Tables<"services"> & {
  service_variations: Tables<"service_variations">[];
  service_addons: Tables<"service_addons">[];
};
