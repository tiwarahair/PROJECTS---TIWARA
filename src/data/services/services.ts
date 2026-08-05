import services from "./services.json";
import type { Service, ServiceId } from "../../types/services";
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

export const capitaliseServiceId = (id: ServiceId) => startCase(id);
