export interface ServiceGroup {
  id: string;
  name: string;
  icon: string;
  description: string;
  image: string;
}

export interface ServiceType {
  id: string;
  groupId: string;
  name: string;
  synonyms: string[];
  isOther: boolean;
  isActive: boolean;
  defaultMinutes: number | null;
  addedPrice: number | null;
  defaultDescription: string | null;
}

export interface PlatformOption {
  label: string;
  price: number;
  minutes: number;
}

export interface PlatformOptions {
  size: PlatformOption[];
  length: PlatformOption[];
}

export interface PlatformAddon {
  name: string;
  price: number;
  minutes: number;
}

/** The platform's service taxonomy (service_groups, service_types, customisation_options, default_addons). */
export interface Catalogue {
  groups: ServiceGroup[];
  types: ServiceType[];
  customisations: Record<string, PlatformOptions>;
  addons: Record<string, PlatformAddon[]>;
}

export interface ServiceSpec {
  minutes: number;
  addedPrice: number;
  description: string;
}
