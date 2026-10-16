import { serviceTypes } from "../../../../data";
import { formatDuration } from "../../../../utils/dates";
import { CATEGORY_COLOURS, NO_CATEGORY_TONE } from "../constants";
import { parseNumber, parseWholeNumber } from "../format";
import type {
  StudioAddon,
  StudioBooking,
  StudioCategory,
  StudioService,
  StudioState,
} from "../types";

export const getSortedCategories = (state: StudioState): StudioCategory[] =>
  state.categories.slice().sort((first, second) => first.sort - second.sort);

export const getCategoryById = (
  state: StudioState,
  id: string | null | undefined,
): StudioCategory | null =>
  state.categories.find((category) => category.id === id) ?? null;

export const getCategoryTone = (
  state: StudioState,
  id: string | null | undefined,
): string => getCategoryById(state, id)?.colour ?? NO_CATEGORY_TONE;

export const getAddonCategory = (
  state: StudioState,
  addon: StudioAddon | null | undefined,
): string =>
  addon && getCategoryById(state, addon.categoryId)
    ? (addon.categoryId as string)
    : "none";

export const getNextCategoryColour = (categories: StudioCategory[]): string => {
  const used = categories.map(({ colour }) => colour);
  const free = CATEGORY_COLOURS.find(({ value }) => !used.includes(value));

  return (
    (free ?? CATEGORY_COLOURS[categories.length % CATEGORY_COLOURS.length])
      ?.value ?? ""
  );
};

export const getCategoryNameError = (
  state: StudioState,
  name: string,
  exceptId?: string,
): string => {
  const trimmed = String(name || "").trim();

  if (!trimmed) return "Add a name";

  const duplicate = state.categories.find(
    ({ id, name: other }) =>
      id !== exceptId && other.trim().toLowerCase() === trimmed.toLowerCase(),
  );

  return duplicate
    ? `You already have a category called ‘${duplicate.name}’`
    : "";
};

export const getTypeOf = (service: StudioService | null | undefined) => {
  if (!service) return null;

  return (
    serviceTypes.find(({ id }) => id === service.typeId) ??
    serviceTypes.find(
      ({ groupId, name }) =>
        groupId === service.taxonomyId && name === service.subcategory,
    ) ??
    null
  );
};

const findService = (state: StudioState, name: string) =>
  state.services.find((item) => item.name === name);

export const getTileTone = (state: StudioState, name: string) => {
  const service = findService(state, name);

  const colour = service
    ? getCategoryTone(state, service.categoryId)
    : NO_CATEGORY_TONE;

  return {
    bar: colour,
    background: `color-mix(in srgb, ${colour} 11%, #fff)`,
    text: "#1a1714",
    meta: "#3d372f",
    hatch: `color-mix(in srgb, ${colour} 18%, transparent)`,
  };
};

export const getServiceExtra = (
  state: StudioState,
  service: StudioService,
): number =>
  service.extraCustom ? service.extra || 0 : state.rules.extra || 0;

export const getExtraByName = (state: StudioState, name: string): number => {
  const service = findService(state, name);

  return service ? getServiceExtra(state, service) : 0;
};

export const getBookingBuffer = (state: StudioState, name: string): number =>
  getExtraByName(state, name) +
  (state.profile.mobile ? state.rules.travel || 0 : 0);

export const getServiceDuration = (state: StudioState, name: string): string =>
  findService(state, name)?.duration || "";

export const getBookingDuration = (
  state: StudioState,
  { duration, service }: StudioBooking,
): string => duration || getServiceDuration(state, service);

interface AddonAmounts {
  price: string | number;
  hours: string | number;
  min: string | number;
}

export const formatAddon = (addon: AddonAmounts): string => {
  const minutes =
    parseWholeNumber(addon.hours) * 60 + parseWholeNumber(addon.min);

  const price = parseNumber(addon.price);
  const timeLabel = minutes ? formatDuration(minutes) : "no extra time";

  return `+£${price}, ${timeLabel}`;
};
