// Studio's reads and writes against Supabase, one file per area (row shapes; each area's records convert them).
import type { Tables } from "../../types/database";
import { supabase } from "../supabase";

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

export type ServiceRow = Tables<"services"> & {
  service_variations: Tables<"service_variations">[];
  service_addons: Tables<"service_addons">[];
};
