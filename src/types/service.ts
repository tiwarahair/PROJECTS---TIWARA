export type ServiceStatus = "active" | "draft" | "archived";

export interface CustomisationOption {
  label: string;
  on: boolean;
  priceDelta: number;
  minutesDelta: number;
}

export interface CustomisationGroup {
  on: boolean;
  options: CustomisationOption[];
}

export interface ServiceCustomisations {
  size: CustomisationGroup;
  length: CustomisationGroup;
}

export interface OwnCustomisationOption {
  label: string;
  priceDelta: number;
  minutesDelta: number;
}

export interface OwnCustomisation {
  name: string;
  options: OwnCustomisationOption[];
}

export interface ServiceAddon {
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
