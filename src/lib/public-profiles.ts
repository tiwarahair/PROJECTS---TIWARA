// Reading a stylist's public profile (get_stylist_profile), in the row shapes Studio reads.
import type { Tables } from "../types/database";
import { supabase } from "./supabase";

export type ServiceRow = Tables<"services"> & {
  service_variations: Tables<"service_variations">[];
  service_addons: Tables<"service_addons">[];
};

export type WorkingHours = Tables<"working_hours">;

export interface PublicProfile extends Pick<
  Tables<"stylists">,
  | "slug"
  | "business_name"
  | "business_type"
  | "bio"
  | "area_label"
  | "travel_radius_miles"
  | "contact_email"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "website"
  | "cover_path"
  | "status"
  | "pause_on"
  | "pause_until"
> {
  next_start: string | null;
  stylist_categories: Tables<"stylist_categories">[];
  services: ServiceRow[];
  addons: Tables<"addons">[];
  working_hours: WorkingHours[];
  payment_policy: Tables<"payment_policies">;
  portfolio_photos: Tables<"portfolio_photos">[];
}

export const fetchPublicProfile = async (slug: string) => {
  const { data, error } = await supabase.rpc("get_stylist_profile", {
    lookup: slug,
  });

  if (error) throw error;

  // the function returns jsonb, which the generated types only know as Json
  return data as unknown as PublicProfile | null;
};
