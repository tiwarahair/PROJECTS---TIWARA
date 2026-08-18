import stylists from "./stylist.json";
import type { Stylist } from "../../types/stylist";
import {
  SERVICES,
  getIndividualService,
  getService,
} from "../services/services";
import type {
  IndividualService,
  Service,
  ServiceId,
} from "../../types/services";
import { RESERVED_SLUGS } from "../../routes/routes";

// will be removed later - and will be asyncrhonous calls to the db
export const STYLISTS = stylists as unknown as Stylist[];

export function findStylist(id: string | null): Stylist | undefined {
  if (!id) return undefined;
  return STYLISTS.find((stylist) => stylist.id === id);
}

/**
 * Resolves a profile URL segment. Reserved slugs are rejected outright so a
 * stylist can never shadow one of the app's own paths.
 */
export function findStylistBySlug(
  slug: string | undefined,
): Stylist | undefined {
  if (!slug || RESERVED_SLUGS.has(slug)) return undefined;
  return STYLISTS.find((stylist) => stylist.slug === slug);
}

/**
 * What a stylist actually offers, in catalogue order. `services` is the
 * capability list — `specialityIds` is a profile headline and mixes style ids
 * in with service ids, so it cannot be used for this.
 *
 * No stylist means no filter: every service is on the table.
 */
export function getOfferedServices(stylistId: string | null): Service[] {
  const stylist = findStylist(stylistId);
  if (!stylist) return [...SERVICES];

  const offered = Object.keys(stylist.services);
  return SERVICES.filter(({ id }) => offered.includes(id));
}

/** The styles a stylist offers within one service, in catalogue order. */
export function getOfferedStyles(
  stylistId: string | null,
  serviceId: ServiceId,
): IndividualService[] {
  const { individualServices } = getService(serviceId);
  const stylist = findStylist(stylistId);
  if (!stylist) return individualServices;

  const offered = Object.keys(stylist.services[serviceId] ?? {});
  return individualServices.filter(({ id }) => offered.includes(id));
}

export interface StyleRate {
  pricePence: number;
  duration: string;
}

/** One bookable row on a stylist's profile: a style, priced by that stylist. */
export interface StylistStyle extends StyleRate {
  serviceId: ServiceId;
  styleId: string;
  label: string;
}

/** Everything a stylist offers, flattened to bookable rows in catalogue order. */
export function getStylistStyles(stylistId: string | null): StylistStyle[] {
  return getOfferedServices(stylistId).flatMap(({ id: serviceId }) =>
    getOfferedStyles(stylistId, serviceId).map(({ id: styleId, label }) => ({
      serviceId,
      styleId,
      label,
      ...getStyleRate(styleId, serviceId, stylistId),
    })),
  );
}

/**
 * What this style costs *here*. A stylist sets their own rates, so theirs win;
 * the catalogue default is only a fallback for browsing without a stylist.
 */
export function getStyleRate(
  styleId: string | null,
  serviceId: ServiceId,
  stylistId: string | null,
): StyleRate {
  const stylistRate = styleId
    ? findStylist(stylistId)?.services[serviceId]?.[styleId]
    : undefined;
  if (stylistRate) return stylistRate;

  const { defaultPricePence = 0, defaultDuration = "" } =
    getIndividualService(styleId, serviceId) ?? {};
  return { pricePence: defaultPricePence, duration: defaultDuration };
}

export const getSpecialty = (specialityIds: ServiceId[]) =>
  specialityIds
    .map((id) => getIndividualService(id)?.label || getService(id)?.label)
    .join(" & ");

// flagship => have this with a boolean for now, ask kash about it, and conditionally render it, just not in db - other options: Featured
