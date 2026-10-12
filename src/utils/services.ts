// Service catalogue helpers.
import { serviceSpecs, serviceTypes } from "../data";
import type {
  CustomisationGroup,
  CustomisationOption,
  OwnCustomisation,
  Service,
  ServiceAddon,
} from "../types/service";
import type { ServiceSpec } from "../types/service-spec";
import type { ServiceType } from "../types/service-type";
import type { Stylist } from "../types/stylist";
import { bookingFee } from "./pricing";
import { formatDuration } from "./dates";
import { roundToPence } from "./money";

const toLower = (value: string): string => value.toLowerCase();

export const getSpec = (name: string): ServiceSpec => {
  const key = toLower(name);
  const entry = serviceSpecs[key];

  if (entry)
    return { minutes: entry[0], addedPrice: entry[1], description: entry[2] };

  // deterministic demo fallback for types without a spec
  let hashValue = 0;

  for (let index = 0; index < key.length; index++)
    hashValue = (hashValue * 31 + key.charCodeAt(index)) % 997;

  return {
    minutes: 90 + (hashValue % 5) * 30,
    addedPrice: 10 + (hashValue % 6) * 10,
    description: "Consultation included · message for options",
  };
};

/** A service readout: as formatDuration, but never under 15 minutes. */
export const formatServiceDuration = (minutes: number): string =>
  formatDuration(Math.max(15, Math.round(minutes)));

const getTypeById = (id: string | null | undefined): ServiceType | null =>
  serviceTypes.find((type) => type.id === id) ?? null;

const isActive = (service: Service | null | undefined): boolean =>
  !!service && service.status === "active";

export const getGroupId = (
  service: Service | null | undefined,
): string | null => getTypeById(service?.serviceTypeId)?.groupId ?? null;

export const getActiveServices = (
  stylist: Stylist | null | undefined,
): Service[] => (stylist?.services ?? []).filter(isActive);

export interface ServiceOptions {
  size: CustomisationOption[];
  length: CustomisationOption[];
  colour: boolean;
  own: OwnCustomisation[];
  addons: ServiceAddon[];
}

const getOnOptions = (
  group: CustomisationGroup | undefined,
): CustomisationOption[] =>
  group?.on ? group.options.filter(({ on }) => on) : [];

/** The customisations a client can pick for a service. */
export const getServiceOptions = (
  service: Service | null | undefined,
): ServiceOptions => {
  const customisations = service?.customisations;

  return {
    size: customisations ? getOnOptions(customisations.size) : [],
    length: customisations ? getOnOptions(customisations.length) : [],
    colour: getGroupId(service) === "braids",
    own: service?.ownCustomisations ?? [],
    addons: service?.addons ?? [],
  };
};

export const hasStep2 = (service: Service): boolean => {
  const { size, length, colour, own, addons } = getServiceOptions(service);

  return !!(
    size.length ||
    length.length ||
    colour ||
    own.length ||
    addons.length
  );
};

const getLowestDelta = (options: CustomisationOption[]): number =>
  options.length ? Math.min(...options.map(({ priceDelta }) => priceDelta)) : 0;

export const getFromPrice = (service: Service): number => {
  const { size, length } = getServiceOptions(service);

  return service.price + getLowestDelta(size) + getLowestDelta(length);
};

/** "From" price including the client booking fee — every displayed "from" price uses this. */
export const getFromWithFee = (service: Service): number => {
  const fromPrice = getFromPrice(service);

  return roundToPence(fromPrice + bookingFee(fromPrice));
};

export const getCustomisationSummary = (service: Service): string => {
  const { size, length, own } = getServiceOptions(service);

  const getRange = (options: CustomisationOption[]): string =>
    options.length > 1
      ? `${options[0]?.label}–${options[options.length - 1]?.label}`
      : (options[0]?.label ?? "");

  const parts: string[] = [];

  if (size.length) parts.push(`Sizes: ${getRange(size)}`);

  if (length.length) parts.push(`Lengths: ${getRange(length)}`);

  own.forEach(({ name, options }) =>
    parts.push(`${name}: ${options.map(({ label }) => label).join(", ")}`),
  );

  return parts.join(" · ");
};

interface MenuSection {
  id: string;
  name: string;
  items: Service[];
  flat?: boolean;
}

/** A stylist's active services grouped by their own categories, "Other services" last, flat if none. */
export const getMenu = (stylist: Stylist | null | undefined): MenuSection[] => {
  const active = getActiveServices(stylist);

  const categories = (stylist?.categories ?? [])
    .slice()
    .sort((left, right) => left.sort - right.sort);

  if (!categories.length)
    return active.length
      ? [{ id: "all", name: "", items: active, flat: true }]
      : [];

  const sections: MenuSection[] = categories
    .map(({ id, name }) => ({
      id,
      name,
      items: active.filter((service) => service.categoryId === id),
    }))
    .filter(({ items }) => items.length);

  const rest = active.filter(
    (service) => !categories.some(({ id }) => id === service.categoryId),
  );

  if (rest.length)
    sections.push({ id: "other", name: "Other services", items: rest });

  return sections;
};

export const matchTypes = (query: string): ServiceType[] => {
  const needle = toLower(query).trim();

  if (!needle) return serviceTypes.slice();

  return serviceTypes.filter(
    ({ name, synonyms }) =>
      toLower(name).includes(needle) ||
      synonyms.some(
        (synonym) =>
          toLower(synonym).includes(needle) ||
          needle.includes(toLower(synonym)),
      ),
  );
};

export const findService = (
  stylist: Stylist | null | undefined,
  idOrName: string,
): Service | null => {
  const services = stylist?.services ?? [];

  return (
    services.find(({ id }) => id === idOrName) ??
    services.find(({ name }) => toLower(name) === toLower(idOrName)) ??
    null
  );
};
