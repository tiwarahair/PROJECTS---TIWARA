export type ServiceId =
  "braids" | "wigs" | "natural-hair" | "locs" | "treatments";

/** A bookable style within a service, e.g. Knotless Braids under Braids. */
export interface IndividualService {
  id: string;
  label: string;
  defaultPricePence: number;
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

/**
 * The single-choice groups that make up a look. Add-ons are deliberately not
 * one — they are optional extras rather than a decision the client must make,
 * so they do not count towards the preview's progress bar.
 */
export type CustomisableGroup = "length" | "hairTexture" | "colour" | "size";

export interface Service {
  id: ServiceId;
  label: string;
  description: string;
  individualServices: IndividualService[];
  customisable: boolean;
  configs?: ServiceConfigs;
}
