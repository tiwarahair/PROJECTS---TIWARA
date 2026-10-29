// The service menu: categories, services with their options and add-on links, and add-ons.
import type { TablesInsert } from "../../types/database";
import { supabase } from "../supabase";
import { write } from "./request";

export const saveCategories = (rows: TablesInsert<"stylist_categories">[]) =>
  write(supabase.from("stylist_categories").upsert(rows));

export const removeCategory = (id: string) =>
  write(supabase.from("stylist_categories").delete().eq("id", id));

/** A service and its sizes / lengths / own options / add-on links, replaced as a whole in one transaction. */
export const saveService = (
  service: TablesInsert<"services">,
  variations: TablesInsert<"service_variations">[],
  addonLinks: TablesInsert<"service_addons">[],
) =>
  write(
    supabase.rpc("save_service", {
      service,
      variations,
      addon_links: addonLinks,
    }),
  );

export const saveServiceStatus = (id: string, status: string) =>
  write(supabase.from("services").update({ status }).eq("id", id));

export const removeService = (id: string) =>
  write(supabase.from("services").delete().eq("id", id));

export const saveAddon = (row: TablesInsert<"addons">) =>
  write(supabase.from("addons").upsert(row));

export const removeAddon = (id: string) =>
  write(supabase.from("addons").delete().eq("id", id));
