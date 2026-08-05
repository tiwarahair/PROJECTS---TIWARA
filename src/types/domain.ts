import type { ServiceId } from "./services";

export interface StylistService {
  name: string;
  price: string;
  duration: string;
}

export interface StylistReview {
  author: string;
  service: string;
  rating: number;
  text: string;
}

export interface Stylist {
  id: string;
  /**
   * URL segment for the profile page, e.g. "tiwaras-house". Stored rather than
   * derived from `name` so a business can rename itself without breaking every
   * link anyone has shared. Must not collide with `RESERVED_SLUGS`.
   */
  slug: string;
  name: string;
  city: string;
  speciality: string;
  rating: number;
  reviewCount: number;
  tags: ServiceId[];
  startingPrice: number;
  nextAvail: string;
  featured: boolean;
  flagship: boolean;
  bio: string;
  topServices: StylistService[];
  catKey: ServiceId;
  /** Complete CSS background value — a radial-gradient. */
  background: string;
  reviews: StylistReview[];
}

export interface StyleOption {
  id: string;
  name: string;
  price: string;
  /** Whole pounds, used as the starting figure in the total. */
  base: number;
  duration: string;
  background: string;
}

export interface ServiceCategory {
  key: ServiceId;
  name: string;
  styles: StyleOption[];
  hasSize: boolean;
  hasLength: boolean;
}

export interface StrandConfig {
  count: number;
  gap: number;
  amp: number;
  width: number;
  phase: number;
}
