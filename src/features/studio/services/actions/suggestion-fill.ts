import { defaultAddons, platformCustomisations } from "../../../../data";
import type { ServiceType } from "../../../../types/service-type";
import { getSpec } from "../../../../utils/services";
import type { VariationRow } from "../../core/types";
import { getTaxonomy, makeVariationRows } from "./helpers";

const toRow = ([label, price, minutes]: [
  string,
  number,
  number,
]): VariationRow => {
  const isNegativeValue = price < 0 || minutes < 0;
  const absoluteMinutes = Math.abs(minutes);
  const sign = isNegativeValue ? "-" : "";

  return {
    label,
    on: true,
    negative: isNegativeValue,
    priceDelta: (price ? sign : "") + Math.abs(price),
    hoursDelta:
      (Math.floor(absoluteMinutes / 60) ? sign : "") +
      Math.floor(absoluteMinutes / 60),
    minutesDelta: (absoluteMinutes % 60 ? sign : "") + (absoluteMinutes % 60),
  };
};

/** What a suggested service type fills in. */
export const getSuggestionFill = (type: ServiceType) => {
  const spec = getSpec(type.name);

  const custom =
    platformCustomisations[type.groupId as keyof typeof platformCustomisations];

  const group = getTaxonomy(type.groupId);

  const getSizes = () => {
    if (custom) return custom.size.map(toRow);

    return group?.sizes ? makeVariationRows(group.sizes) : [];
  };

  const getLengths = () => {
    if (custom) return custom.length.map(toRow);

    return group?.lengths ? makeVariationRows(group.lengths) : [];
  };

  return {
    name: type.name,
    description: spec.description || "",
    taxonomyId: type.groupId,
    subcategory: type.name,
    typeId: type.id,
    price: String(spec.addedPrice),
    durationHours: String(Math.floor(spec.minutes / 60)),
    durationMinutes: String(spec.minutes % 60),
    sizesOn: !!custom,
    lengthsOn: !!custom,
    sizes: getSizes(),
    lengths: getLengths(),
    addonDefinitions: defaultAddons[type.groupId] || [],
  };
};

export type SuggestionFill = ReturnType<typeof getSuggestionFill>;
