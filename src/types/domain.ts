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
