import type { Tables } from "../types/database";
import type {
  Catalogue,
  PlatformAddon,
  PlatformOptions,
} from "../types/catalogue";
import { supabase } from "./supabase";
import { toPounds } from "../utils/money";

interface CatalogueRows {
  groups: Tables<"service_groups">[];
  types: Tables<"service_types">[];
  customisations: Tables<"customisation_options">[];
  addons: Tables<"default_addons">[];
}

/** What pages use until the catalogue has loaded. */
export const EMPTY_CATALOGUE: Catalogue = {
  groups: [],
  types: [],
  customisations: {},
  addons: {},
};

export const toCatalogue = ({
  groups,
  types,
  customisations,
  addons,
}: CatalogueRows): Catalogue => {
  const platformOptions: Record<string, PlatformOptions> = {};
  const platformAddons: Record<string, PlatformAddon[]> = {};

  for (const {
    group_id,
    kind,
    label,
    price_delta_pence,
    minutes_delta,
  } of customisations) {
    const options = (platformOptions[group_id] ??= { size: [], length: [] });

    if (kind === "size" || kind === "length")
      options[kind].push({
        label,
        price: toPounds(price_delta_pence),
        minutes: minutes_delta,
      });
  }

  for (const { id } of groups) platformAddons[id] = [];

  for (const { group_id, name, price_pence, minutes } of addons)
    (platformAddons[group_id] ??= []).push({
      name,
      price: toPounds(price_pence),
      minutes,
    });

  return {
    groups: groups.map(({ id, name, icon, description, image }) => ({
      id,
      name,
      icon,
      description,
      image,
    })),
    types: types.map((type) => ({
      id: type.id,
      groupId: type.group_id,
      name: type.name,
      synonyms: type.synonyms,
      isOther: type.is_other,
      isActive: type.active,
      defaultMinutes: type.default_minutes,
      addedPrice:
        type.added_price_pence == null
          ? null
          : toPounds(type.added_price_pence),
      defaultDescription: type.default_description,
    })),
    customisations: platformOptions,
    addons: platformAddons,
  };
};

const getRows = async <Row>(
  query: PromiseLike<{ data: Row[] | null; error: unknown }>,
) => {
  const { data, error } = await query;

  if (error) throw error;

  return data ?? [];
};

export const fetchCatalogue = async (): Promise<Catalogue> => {
  const [groups, types, customisations, addons] = await Promise.all([
    getRows(supabase.from("service_groups").select("*").order("sort")),
    getRows(supabase.from("service_types").select("*").order("sort")),
    getRows(supabase.from("customisation_options").select("*").order("sort")),
    getRows(supabase.from("default_addons").select("*").order("sort")),
  ]);

  return toCatalogue({ groups, types, customisations, addons });
};
