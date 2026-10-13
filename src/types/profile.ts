export interface Profile {
  first: string;
  last: string;
  mobile: string;
  marketing: boolean;
}

export interface StylistStudioService {
  id: string;
  name: string;
  description: string | null;
  groupId: string;
  typeId: string;
  categoryId: string | null;
  durationMin: number | null;
  pricePence: number | null;
}

/** The signed-in stylist's business, as Studio needs it on first load. */
export interface StylistStudio {
  businessName: string;
  /** shop | chair_rental | home_based | mobile */
  businessType: string;
  areaLabel: string | null;
  travelRadiusMiles: number | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: { line1: string; line2: string; city: string; postcode: string };
  categories: {
    id: string;
    name: string;
    sort: number;
    colour: string | null;
  }[];
  services: StylistStudioService[];
}
