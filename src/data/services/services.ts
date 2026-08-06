import services from "./services.json";
import type {
  CustomisableGroup,
  Service,
  ServiceId,
} from "../../types/services";
import { startCase } from "lodash";

export const SERVICES = services as Service[];

export const DEFAULT_SERVICE_ID: ServiceId = "braids";

export const STYLIST_SERVICES = SERVICES.map(({ label }) => label);
// add "Colouring"?

export const getService = (id: ServiceId) =>
  SERVICES.find((service) => service.id === id) ??
  SERVICES.find((service) => service.id === DEFAULT_SERVICE_ID)!;

export const getIndividualService = (
  styleId: string | null,
  key?: ServiceId,
) => {
  if (key) {
    return SERVICES.find(({ id }) => id === key)?.individualServices.find(
      (style) => style.id === styleId,
    );
  }

  const individualServices = SERVICES.flatMap(
    ({ individualServices }) => individualServices,
  );

  return individualServices.find((style) => style.id === styleId);
};

/**
 * Whether a service has anything worth showing on the customise step. Treatments
 * do not — no length, size or colour, and "Other" as their only add-on. An
 * unchosen service counts as customisable, since there is nothing to rule out yet.
 */
export const isCustomisable = (id: ServiceId | null) =>
  id === null || getService(id).customisable;

export const capitaliseServiceId = (id: ServiceId) => startCase(id);

/** Customise-step render order, so the preview's segments match the column. */
const GROUP_ORDER: readonly CustomisableGroup[] = [
  "length",
  "hairTexture",
  "colour",
  "size",
];

/**
 * The look groups this service asks about, in the order they appear on the
 * customise step. Treatments has no `configs` at all and yields an empty list.
 */
export const getCustomisableGroups = (
  id: ServiceId | null,
): CustomisableGroup[] => {
  if (!id) return [];
  const { configs = {} } = getService(id);
  return GROUP_ORDER.filter((group) => configs[group]);
};
