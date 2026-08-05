import type { ServiceId } from "./services";

export interface Stylist {
  id: string; // will be db id
  name: string;
  slug: string; // where to get the slug from?
  location: string; // will not be a string with a name?
  specialityIds: ServiceId[];
  description: string;
  pending?: boolean;
  services: Record<
    ServiceId,
    Record<string, { price: number; duration: string }>
  >;

  // more
  portfolioPictures?: string[];
  email: string;
  yearsOfExperience?: string;
  number?: string;
  instagram?: string;
  avatar?: string;
}
