// The service menu: categories, services with their options and add-on links, and add-ons.
import type { TablesInsert } from "../../types/database";
import { notifyStudioWrite } from "../studio-writes";
import { supabase } from "../supabase";
import { check, write } from "./request";

export const saveCategories = (rows: TablesInsert<"stylist_categories">[]) =>
  write(supabase.from("stylist_categories").upsert(rows));

export const removeCategory = (id: string) =>
  write(supabase.from("stylist_categories").delete().eq("id", id));

/** A service and its sizes / lengths / own options / add-on links / photos, replaced as a whole. */
export const saveService = async (
  service: TablesInsert<"services">,
  variations: TablesInsert<"service_variations">[],
  addonLinks: TablesInsert<"service_addons">[],
  photoIds: string[] = [],
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

    // unlink first, so a service swapping a photo never counts six
    const unlinked = supabase
      .from("portfolio_photos")
      .update({ service_id: null })
      .eq("service_id", serviceId);

    await check(
      photoIds.length
        ? unlinked.not("id", "in", `(${photoIds.join(",")})`)
        : unlinked,
    );

    if (photoIds.length)
      await check(
        supabase
          .from("portfolio_photos")
          .update({ service_id: serviceId })
          .in("id", photoIds),
      );
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
