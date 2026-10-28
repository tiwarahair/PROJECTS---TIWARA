import type {
  Catalogue,
  PlatformOption,
  ServiceType,
} from "../../../../types/catalogue";
import { getSpec } from "../../../../utils/services";
import type { VariationRow } from "../../core/types";

const toRow = ({ label, price, minutes }: PlatformOption): VariationRow => {
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
export const getSuggestionFill = (
  type: ServiceType,
  { customisations, addons }: Catalogue,
) => {
  const spec = getSpec(type);
  const platformOptions = customisations[type.groupId];

  return {
    name: type.name,
    description: spec.description || "",
    taxonomyId: type.groupId,
    subcategory: type.name,
    typeId: type.id,
    price: String(spec.addedPrice),
    durationHours: String(Math.floor(spec.minutes / 60)),
    durationMinutes: String(spec.minutes % 60),
    sizesOn: !!platformOptions,
    lengthsOn: !!platformOptions,
    sizes: platformOptions?.size.map(toRow) ?? [],
    lengths: platformOptions?.length.map(toRow) ?? [],
    addonDefinitions: addons[type.groupId] || [],
  };
};

export type SuggestionFill = ReturnType<typeof getSuggestionFill>;
