import { parseNumber, parseWholeNumber } from "../../core/format";
import type { StudioAddon, StudioState } from "../../core/types";
import type { AddonValue } from "./types";

export const getAddonMinutes = ({ hours, min }: StudioAddon) =>
  parseWholeNumber(hours) * 60 + parseWholeNumber(min);

export const getAddonValue = (
  addon: StudioAddon,
  overrides: NonNullable<StudioState["addAddonOverrides"]>,
): AddonValue => {
  const override = overrides[addon.id];

  return {
    price: override?.price != null ? override.price : parseNumber(addon.price),
    minutes:
      override?.minutes != null ? override.minutes : getAddonMinutes(addon),
    quantity: override?.quantity || 1,
  };
};
