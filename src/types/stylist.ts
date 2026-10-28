import type { Policy } from "./policy";
import type { Service } from "./service";

type BusinessType = "shop" | "chairRental" | "homeBased" | "mobile";

export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
/** Free window as ["HH:MM", "HH:MM"]. */
type AvailabilityWindow = [string, string];

interface StylistCategory {
  id: string;
  name: string;
  sort: number;
  colour: string;
}

interface StylistAddress {
  line1: string;
  town: string;
  postcode: string;
}

export interface Stylist {
  id: string;
  site?: string;
  email?: string;
  name: string;
  area: string;
  businessType: BusinessType;
  travelMiles?: number;
  lat: number;
  lng: number;
  rating: number;
  reviews: number;
  from: number;
  verified: boolean;
  cover: string;
  bio: string;
  portfolio: string[];
  photoServiceIds?: Record<string, string>;
  policies: Policy;
  categories: StylistCategory[];
  availability: Partial<Record<Weekday, AvailabilityWindow[]>>;
  services: Service[];
  mobile: boolean;
  groups: string[];
  address: StylistAddress;
  addressFull: string;
  areaShort: string;
  fromFee: number | null;
  fromLabel: string;
}
