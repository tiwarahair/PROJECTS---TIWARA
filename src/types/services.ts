export type ServiceId =
  "braids" | "wigs" | "natural-hair" | "locs" | "treatments";

/** A bookable style within a service, e.g. Knotless Braids under Braids. */
export interface IndividualService {
  id: string;
  label: string;
  defaultPrice: number;
  defaultDuration: string;
}

/** Which customisation steps a service offers. */
export interface ServiceConfigs {
  size?: boolean;
  length?: boolean;
  colour?: boolean;
  hairTexture?: boolean;
  addOns?: boolean;
}

export interface Service {
  id: ServiceId;
  label: string;
  description: string;
  individualServices: IndividualService[];
  customisable: boolean;
  configs?: ServiceConfigs;
}
