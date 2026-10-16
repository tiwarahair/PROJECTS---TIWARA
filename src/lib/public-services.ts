// A profile's service rows → the Service shape the menu and booking read (pence → pounds).
import type { Tables } from "../types/database";
import type { CustomisationOption, Service } from "../types/service";
import { bySort } from "../utils/sort";
import type { ServiceRow } from "./public-profiles";

type VariationRow = Tables<"service_variations">;

const toOptions = (rows: VariationRow[]): CustomisationOption[] =>
  rows.map(({ id, label, offered, price_delta_pence, minutes_delta }) => ({
    id,
    label,
    on: offered,
    priceDelta: price_delta_pence / 100,
    minutesDelta: minutes_delta,
  }));

const toAddons = (row: ServiceRow, addons: Tables<"addons">[]) =>
  row.service_addons.flatMap(
    ({ addon_id, price_override_pence, minutes_override }) =>
      addons
        .filter(({ id }) => id === addon_id)
        .map(({ id, name, price_pence, minutes }) => ({
          id,
          name,
          price: (price_override_pence ?? price_pence) / 100,
          minutes: minutes_override ?? minutes,
        })),
  );

export const toService = (
  row: ServiceRow,
  addons: Tables<"addons">[],
): Service => {
  const variations = [...row.service_variations].sort(bySort);

  const ofKind = (kind: string) =>
    variations.filter((item) => item.kind === kind);

  const ownGroups = [
    ...new Set(ofKind("own").map(({ group_name }) => group_name ?? "")),
  ];

  return {
    id: row.id,
    name: row.name,
    serviceTypeId: row.service_type_id,
    categoryId: row.category_id,
    price: (row.price_pence ?? 0) / 100,
    minutes: row.duration_min ?? 0,
    description: row.description ?? "",
    status: "active",
    customisations: {
      size: { on: row.sizes_on, options: toOptions(ofKind("size")) },
      length: { on: row.lengths_on, options: toOptions(ofKind("length")) },
    },
    ownCustomisations: ownGroups.map((name) => ({
      name,
      options: toOptions(
        ofKind("own").filter(({ group_name }) => group_name === name),
      ),
    })),
    addons: toAddons(row, addons),
  };
};
