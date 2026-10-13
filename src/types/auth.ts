export type AccountKind = "customer" | "stylist" | "none";

export interface PersonDetails {
  first: string;
  last: string;
  mobile: string;
  marketing: boolean;
}

export interface StylistDetails extends PersonDetails {
  businessName: string;
  businessType: "shop" | "chair_rental" | "home_based" | "mobile";
  line1: string;
  line2: string;
  city: string;
  postcode: string;
  lat: number;
  lng: number;
  areaLabel: string | null;
  travelRadiusMiles: number | null;
  categories: string[];
  contactEmail: string | null;
  contactPhone: string | null;
  referralSource: string;
}
