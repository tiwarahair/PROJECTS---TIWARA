export type ServiceCategoryKey =
  "braids" | "wigs" | "natural" | "locs" | "treatments";

export type ColourId = "1b" | "30" | "4/33" | "613" | "other";

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
  name: string;
  city: string;
  speciality: string;
  rating: number;
  reviewCount: number;
  tags: ServiceCategoryKey[];
  startingPrice: number;
  nextAvail: string;
  featured: boolean;
  flagship: boolean;
  bio: string;
  topServices: StylistService[];
  catKey: ServiceCategoryKey;
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
  key: ServiceCategoryKey;
  name: string;
  styles: StyleOption[];
  hasSize: boolean;
  hasLength: boolean;
}

export interface HairColour {
  id: ColourId;
  /** Shown in the summary and the preview caption. */
  name: string;
  /** Tooltip on the swatch; differs from `name` for the mixed shades. */
  title: string;
  /** Short text printed on the swatch tile. */
  label: string;
  /** rgba() used inside the preview panel's radial-gradient. */
  glow: string;
  /** Stroke colour for the SVG strands. */
  strand: string;
  /** Background of the picker tile. Deliberately NOT the same as `strand`. */
  swatch: string;
}

export interface StrandConfig {
  count: number;
  gap: number;
  amp: number;
  width: number;
  phase: number;
}
