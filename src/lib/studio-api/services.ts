// The service menu: categories, services with their options and add-on links, and add-ons.
import type { TablesInsert } from "../../types/database";
import { notifyStudioWrite } from "../studio-writes";
import { supabase } from "../supabase";
import { check, write } from "./request";

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

export const removeService = (id: string) =>
  write(supabase.from("services").delete().eq("id", id));

export const saveAddon = (row: TablesInsert<"addons">) =>
  write(supabase.from("addons").upsert(row));

export const removeAddon = (id: string) =>
  write(supabase.from("addons").delete().eq("id", id));
