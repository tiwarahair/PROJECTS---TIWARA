type ServiceStatus = "active" | "draft" | "archived";

/** `id`: the database row (real stylists); the demo data has none. */
export interface CustomisationOption {
  id?: string;
  label: string;
  on: boolean;
  priceDelta: number;
  minutesDelta: number;
}

export interface CustomisationGroup {
  on: boolean;
  options: CustomisationOption[];
}

interface ServiceCustomisations {
  size: CustomisationGroup;
  length: CustomisationGroup;
}

interface OwnCustomisationOption {
  id?: string;
  label: string;
  priceDelta: number;
  minutesDelta: number;
}

export interface OwnCustomisation {
  name: string;
  options: OwnCustomisationOption[];
}

export interface ServiceAddon {
  id?: string;
  name: string;
  price: number;
  minutes: number;
}

export interface Service {
  id: string;
  name: string;
  serviceTypeId: string;
  categoryId: string | null;
  price: number;
  minutes: number;
  description: string;
  status: ServiceStatus;
  customisations: ServiceCustomisations | null;
  ownCustomisations: OwnCustomisation[];
  addons: ServiceAddon[];
}
