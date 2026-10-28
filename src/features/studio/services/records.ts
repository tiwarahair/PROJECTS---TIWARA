// Services, add-ons and categories ⇄ database rows. Money is pence in the database and pounds in Studio.
import type { ServiceType } from "../../../types/catalogue";
import type { ServiceRow, StylistStudio } from "../../../lib/studio-api";
import type { TablesInsert } from "../../../types/database";
import { formatDuration } from "../../../utils/dates";
import { bySort } from "../../../utils/sort";
import { parseNumber } from "../core/format";
import { findServiceType } from "../core/model";
import type {
  OwnGroup,
  StudioAddon,
  StudioCategory,
  StudioService,
  VariationRow,
} from "../core/types";

const toPence = (pounds: string | number) =>
  Math.round(parseNumber(pounds) * 100);

const toPounds = (pence: number | null) => (pence ?? 0) / 100;

const toWholeMinutes = (hours: string | number, minutes: string | number) =>
  Math.round(parseNumber(hours) * 60 + parseNumber(minutes));

/** A size / length row: signed £ and time as the wizard's text fields. */
export const toVariationRow = (
  label: string,
  pounds: number,
  minutes: number,
  on = true,
): VariationRow => {
  const isNegative = pounds < 0 || minutes < 0;
  const sign = isNegative ? "-" : "";
  const absoluteMinutes = Math.abs(minutes);
  const hours = Math.floor(absoluteMinutes / 60);

  return {
    label,
    on,
    negative: isNegative,
    priceDelta: (pounds ? sign : "") + Math.abs(pounds),
    hoursDelta: (hours ? sign : "") + hours,
    minutesDelta: (absoluteMinutes % 60 ? sign : "") + (absoluteMinutes % 60),
  };
};

const toOwnGroups = (rows: ServiceRow["service_variations"]): OwnGroup[] => {
  const groups = new Map<string, OwnGroup>();

  for (const row of rows.filter(({ kind }) => kind === "own")) {
    const name = row.group_name ?? "";
    const group = groups.get(name) ?? { name, options: [] };

    const option = toVariationRow(
      row.label,
      toPounds(row.price_delta_pence),
      row.minutes_delta,
    );

    group.options.push({
      label: row.label,
      negative: option.negative,
      priceDelta: option.priceDelta,
      minutesDelta: String(row.minutes_delta),
    });

    groups.set(name, group);
  }

  return [...groups.values()];
};

export const toStudioService = (
  row: ServiceRow,
  photoIds: string[] = [],
): StudioService => {
  const minutes = row.duration_min ?? 0;

  const rowsOf = (kind: "size" | "length") =>
    row.service_variations
      .filter((variation) => variation.kind === kind)
      .sort(bySort)
      .map(({ label, price_delta_pence, minutes_delta, offered }) =>
        toVariationRow(
          label,
          toPounds(price_delta_pence),
          minutes_delta,
          offered,
        ),
      );

  return {
    id: row.id,
    taxonomyId: row.service_group_id,
    subcategory: row.name,
    typeId: row.service_type_id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description ?? "",
    price: toPounds(row.price_pence),
    durationHours: Math.floor(minutes / 60),
    durationMinutes: minutes % 60,
    duration: minutes ? formatDuration(minutes) : "",
    extra: row.extra_time_min ?? undefined,
    extraCustom: row.extra_time_min != null,
    status: row.status,
    sizesOn: row.sizes_on,
    lengthsOn: row.lengths_on,
    sizes: rowsOf("size"),
    lengths: rowsOf("length"),
    own: toOwnGroups(row.service_variations),
    addons: row.service_addons.map(
      ({ addon_id, price_override_pence, minutes_override }) => ({
        addonId: addon_id,
        priceOverride:
          price_override_pence == null ? null : toPounds(price_override_pence),
        hoursOverride:
          minutes_override == null ? null : Math.floor(minutes_override / 60),
        minutesOverride:
          minutes_override == null ? null : minutes_override % 60,
      }),
    ),
    photoIds,
  };
};

/** The wizard may leave the type blank: match it by name in its group, else the group's "Other". */
const getServiceTypeId = (service: StudioService, types: ServiceType[]) =>
  service.typeId ??
  (
    findServiceType(service, types) ??
    types.find(
      ({ groupId, isOther, isActive }) =>
        isActive && isOther && groupId === service.taxonomyId,
    )
  )?.id ??
  "";

export const fromStudioService = (
  service: StudioService,
  stylistId: string,
  sort: number,
  types: ServiceType[],
) => {
  const variationsOf = (kind: "size" | "length", rows: VariationRow[]) =>
    rows.map(({ label, on, priceDelta, hoursDelta, minutesDelta }, index) => ({
      service_id: service.id,
      kind,
      label,
      offered: on,
      price_delta_pence: toPence(priceDelta),
      minutes_delta: toWholeMinutes(hoursDelta, minutesDelta),
      sort: index,
    }));

  const own = (service.own ?? []).flatMap(({ name, options }) =>
    options.map(({ label, priceDelta, minutesDelta }, index) => ({
      service_id: service.id,
      kind: "own",
      group_name: name,
      label,
      offered: true,
      price_delta_pence: toPence(priceDelta),
      minutes_delta: Math.round(parseNumber(minutesDelta)),
      sort: index,
    })),
  );

  const row: TablesInsert<"services"> = {
    id: service.id,
    stylist_id: stylistId,
    service_type_id: getServiceTypeId(service, types),
    service_group_id: service.taxonomyId ?? "",
    category_id: service.categoryId,
    name: service.name,
    description: service.description,
    price_pence: toPence(service.price),
    duration_min:
      toWholeMinutes(service.durationHours, service.durationMinutes) || null,
    extra_time_min: service.extraCustom ? (service.extra ?? 0) : null,
    status: service.status,
    sizes_on: service.sizesOn,
    lengths_on: service.lengthsOn,
    sort,
  };

  const variations: TablesInsert<"service_variations">[] = [
    ...variationsOf("size", service.sizes),
    ...variationsOf("length", service.lengths),
    ...own,
  ];

  const addonLinks: TablesInsert<"service_addons">[] = service.addons.map(
    ({ addonId, priceOverride, hoursOverride, minutesOverride }) => ({
      service_id: service.id,
      addon_id: addonId,
      price_override_pence:
        priceOverride == null || priceOverride === ""
          ? null
          : toPence(priceOverride),
      minutes_override:
        hoursOverride == null && minutesOverride == null
          ? null
          : toWholeMinutes(hoursOverride ?? 0, minutesOverride ?? 0),
    }),
  );

  return { row, variations, addonLinks, photoIds: service.photoIds ?? [] };
};

export const toStudioAddon = (
  row: StylistStudio["addons"][number],
): StudioAddon => ({
  id: row.id,
  taxonomyId: row.service_group_id ?? undefined,
  categoryId: row.category_id,
  name: row.name,
  price: toPounds(row.price_pence),
  hours: Math.floor(row.minutes / 60),
  min: row.minutes % 60,
  status: row.status,
});

export const fromStudioAddon = (
  addon: StudioAddon,
  stylistId: string,
): TablesInsert<"addons"> => ({
  id: addon.id,
  stylist_id: stylistId,
  service_group_id: addon.taxonomyId ?? null,
  category_id: addon.categoryId,
  name: addon.name.trim(),
  price_pence: toPence(addon.price),
  minutes: toWholeMinutes(addon.hours, addon.min),
  status: addon.status ?? "active",
});

export const fromCategories = (
  categories: StudioCategory[],
  stylistId: string,
): TablesInsert<"stylist_categories">[] =>
  categories.map(({ id, name, sort, colour }) => ({
    id,
    stylist_id: stylistId,
    name,
    sort,
    colour,
  }));
