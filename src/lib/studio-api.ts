// Studio's reads and writes against Supabase (row shapes; studio-records converts them).
import imageCompression from "browser-image-compression";
import type { TaxDetails } from "../components/tax-details-form/tax-details-logic";
import type { Tables, TablesInsert, TablesUpdate } from "../types/database";
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

export const getPhotoUrl = (path: string) =>
  supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;

/** The storage path inside a photo URL; null for anything else (previews, demo photos). */
export const getPhotoPath = (url: string) =>
  url.split(`/${PHOTO_BUCKET}/`)[1] ?? null;

/** Resizes in the browser (long side 2000px for covers and portfolio, 600px for avatars), then uploads. */
export const uploadPhoto = async (path: string, file: File, maxSide = 2000) => {
  const resized = await imageCompression(file, {
    maxWidthOrHeight: maxSide,
    maxSizeMB: 1.5,
    fileType: "image/jpeg",
    useWebWorker: true,
  });

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, resized, { upsert: true, contentType: "image/jpeg" });

  if (error) throw error;

  return path;
};

export const removePhoto = (path: string) =>
  check(supabase.storage.from(PHOTO_BUCKET).remove([path]));

export const updateStylist = (id: string, patch: TablesUpdate<"stylists">) =>
  check(supabase.from("stylists").update(patch).eq("id", id));

export const updateStylistAddress = (
  stylistId: string,
  patch: TablesUpdate<"stylist_private">,
) =>
  check(
    supabase.from("stylist_private").update(patch).eq("stylist_id", stylistId),
  );

export const saveCategories = (rows: TablesInsert<"stylist_categories">[]) =>
  check(supabase.from("stylist_categories").upsert(rows));

export const removeCategory = (id: string) =>
  check(supabase.from("stylist_categories").delete().eq("id", id));

/** A service and its sizes / lengths / own options / add-on links, replaced as a whole. */
export const saveService = async (
  service: TablesInsert<"services">,
  variations: TablesInsert<"service_variations">[],
  addonLinks: TablesInsert<"service_addons">[],
) => {
  const serviceId = service.id ?? "";

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
};

export const saveServiceStatus = (id: string, status: string) =>
  check(supabase.from("services").update({ status }).eq("id", id));

export const removeService = (id: string) =>
  check(supabase.from("services").delete().eq("id", id));

export const saveAddon = (row: TablesInsert<"addons">) =>
  check(supabase.from("addons").upsert(row));

export const removeAddon = (id: string) =>
  check(supabase.from("addons").delete().eq("id", id));

export const saveHours = (rows: TablesInsert<"working_hours">[]) =>
  check(supabase.from("working_hours").upsert(rows));

export const saveBlock = (row: TablesInsert<"time_blocks">) =>
  check(supabase.from("time_blocks").upsert(row));

export const removeBlock = (id: string) =>
  check(supabase.from("time_blocks").delete().eq("id", id));

export const saveClosedPeriod = (row: TablesInsert<"closed_periods">) =>
  check(supabase.from("closed_periods").upsert(row));

export const removeClosedPeriod = (id: string) =>
  check(supabase.from("closed_periods").delete().eq("id", id));

export const saveBookingRules = (row: TablesInsert<"booking_rules">) =>
  check(supabase.from("booking_rules").upsert(row));

/** Policies are history: each save adds the new current one. */
export const addPaymentPolicy = (row: TablesInsert<"payment_policies">) =>
  check(supabase.from("payment_policies").insert(row));

export const addPortfolioPhoto = (row: TablesInsert<"portfolio_photos">) =>
  check(supabase.from("portfolio_photos").insert(row));

export const removePortfolioPhoto = (id: string) =>
  check(supabase.from("portfolio_photos").delete().eq("id", id));

export const isSlugFree = (slug: string, stylistId: string) =>
  check(
    supabase.rpc("is_slug_free", { candidate: slug, for_stylist: stylistId }),
  );

/** Returns the new slug; throws with the server's reason (taken, reserved, 30-day limit). */
export const changeSlug = (slug: string) =>
  check(supabase.rpc("change_slug", { new_slug: slug }));

/** Saves through the Edge Function (it encrypts the NI number); returns the saved number's masked hint. */
export const saveTaxDetails = async (details: TaxDetails) => {
  const { data, error } = await supabase.functions.invoke<{
    nationalInsuranceHint: string | null;
  }>("save-tax-details", { body: details });

  if (error) throw error;

  return data?.nationalInsuranceHint ?? "";
};

/** Takes the booking page offline; it can be reopened for 15 days. */
export const closeBusiness = () => check(supabase.rpc("close_business"));

export const reopenBusiness = () => check(supabase.rpc("reopen_business"));

export type ServiceRow = Tables<"services"> & {
  service_variations: Tables<"service_variations">[];
  service_addons: Tables<"service_addons">[];
};
