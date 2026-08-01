import type { ServiceCategoryKey } from "../types/domain";
import type { ColourId } from "../types/domain";

export interface AiStyleMatch {
  styleId: string;
  categoryKey: ServiceCategoryKey;
  name: string;
  price: string;
}

export interface AiColourMatch {
  id: ColourId;
  name: string;
  /** Perceived-brightness value this colour is matched against. */
  brightness: number;
}

// TO DO: RENAME categoryKey TO serviceCategoryKey

export const AI_STYLE_MATCHES: readonly AiStyleMatch[] = [
  {
    styleId: "knotless",
    categoryKey: "braids",
    name: "Knotless Braids",
    price: "from £130",
  },
  {
    styleId: "fulani",
    categoryKey: "braids",
    name: "Fulani Braids",
    price: "from £110",
  },
  {
    styleId: "cornrows",
    categoryKey: "braids",
    name: "Cornrows",
    price: "from £60",
  },
  {
    styleId: "lacefront",
    categoryKey: "wigs",
    name: "Lace Front Install",
    price: "from £120",
  },
  {
    styleId: "starterlocs",
    categoryKey: "locs",
    name: "Starter Locs",
    price: "from £150",
  },
  {
    styleId: "washstyle",
    categoryKey: "natural",
    name: "Wash & Style",
    price: "from £55",
  },
  {
    styleId: "senegalese",
    categoryKey: "locs",
    name: "Senegalese Twists",
    price: "from £110",
  },
  {
    styleId: "feedin",
    categoryKey: "braids",
    name: "Feed-In Braids",
    price: "from £80",
  },
];

export const AI_COLOUR_MATCHES: readonly AiColourMatch[] = [
  { id: "1b", name: "1B Natural Black", brightness: 10 },
  { id: "burgundy", name: "Burgundy", brightness: 22 },
  { id: "4", name: "4 Dark Brown", brightness: 35 },
  { id: "ombre", name: "Ombre", brightness: 50 },
  { id: "30", name: "30 Auburn", brightness: 62 },
  { id: "27", name: "27 Honey Blonde", brightness: 75 },
  { id: "613", name: "613 Platinum", brightness: 90 },
];

/** Confidence labels shown against the primary match and its two alternates. */
export const AI_CONFIDENCE_LABELS: readonly string[] = [
  "98% match",
  "84% match",
  "71% match",
];

export const AI_MATCH_COUNT = 3;
