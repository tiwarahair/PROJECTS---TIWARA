import stylists from "./stylist.json";
import type { Stylist } from "../../types/stylist";
import { getIndividualService, getService } from "../services/services";
import type { ServiceId } from "../../types/services";
import { RESERVED_SLUGS } from "../../routes/routes";

// will be removed later - and will be asyncrhonous calls to the db
export const STYLISTS = stylists as Stylist[];

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

export const getSpecialty = (specialityIds: ServiceId[]) =>
  specialityIds
    .map((id) => getIndividualService(id)?.label || getService(id)?.label)
    .join(" & ");

// flagship => have this with a boolean for now, ask kash about it, and conditionally render it, just not in db - other options: Featured
