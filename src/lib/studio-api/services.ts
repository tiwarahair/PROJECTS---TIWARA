// The service menu: categories, services with their options and add-on links, and add-ons.
import type { TablesInsert } from "../../types/database";
import { notifyStudioWrite } from "../studio-writes";
import { supabase } from "../supabase";
import { check, write } from "./request";

export const saveCategories = (rows: TablesInsert<"stylist_categories">[]) =>
  write(supabase.from("stylist_categories").upsert(rows));

export const removeCategory = (id: string) =>
  write(supabase.from("stylist_categories").delete().eq("id", id));

/** A service and its sizes / lengths / own options / add-on links, replaced as a whole in one transaction, then its photos. */
export const saveService = async (
  service: TablesInsert<"services">,
  variations: TablesInsert<"service_variations">[],
  addonLinks: TablesInsert<"service_addons">[],
  photoIds: string[] = [],
) => {
  const serviceId = service.id ?? "";

  try {
    await check(
      supabase.rpc("save_service", {
        service,
        variations,
        addon_links: addonLinks,
      }),
    );

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

export const removeService = (id: string) =>
  write(supabase.from("services").delete().eq("id", id));

export const saveAddon = (row: TablesInsert<"addons">) =>
  write(supabase.from("addons").upsert(row));

export const removeAddon = (id: string) =>
  write(supabase.from("addons").delete().eq("id", id));
