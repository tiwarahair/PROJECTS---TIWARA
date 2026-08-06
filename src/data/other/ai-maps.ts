// todo: read

import type { ServiceId } from "../../types/services";

export interface AiStyleMatch {
  styleId: string;
  serviceId: ServiceId;
  name: string;
  price: string;
}

export interface AiColourMatch {
  name: string;
  /** Perceived-brightness value this colour is matched against. */
  brightness: number;
}

// TO DO: USE LIVE DATA FROM SERVICES.JSON INSTEAD OF HARDCODED VALUES

export const AI_STYLE_MATCHES: readonly AiStyleMatch[] = [
  {
    styleId: "knotless",
    serviceId: "braids",
    name: "Knotless Braids",
    price: "from £130",
  },
  {
    styleId: "fulani",
    serviceId: "braids",
    name: "Fulani Braids",
    price: "from £110",
  },
  {
    styleId: "cornrows",
    serviceId: "braids",
    name: "Cornrows",
    price: "from £60",
  },
  {
    styleId: "lacefront",
    serviceId: "wigs",
    name: "Lace Front Install",
    price: "from £120",
  },
  {
    styleId: "starterlocs",
    serviceId: "locs",
    name: "Starter Locs",
    price: "from £150",
  },
  {
    styleId: "washstyle",
    serviceId: "natural-hair",
    name: "Wash & Style",
    price: "from £55",
  },
  {
    styleId: "senegalese",
    serviceId: "locs",
    name: "Senegalese Twists",
    price: "from £110",
  },
  {
    styleId: "feedin",
    serviceId: "braids",
    name: "Feed-In Braids",
    price: "from £80",
  },
];

// to do: replace with 'colours' data
export const AI_COLOUR_MATCHES: readonly AiColourMatch[] = [
  { name: "1B Natural Black", brightness: 10 },
  { name: "Burgundy", brightness: 22 },
  { name: "4 Dark Brown", brightness: 35 },
  { name: "Ombre", brightness: 50 },
  { name: "30 Auburn", brightness: 62 },
  { name: "27 Honey Blonde", brightness: 75 },
  { name: "613 Platinum", brightness: 90 },
];

/** Confidence labels shown against the primary match and its two alternates. */
export const AI_CONFIDENCE_LABELS: readonly string[] = [
  "98% match",
  "84% match",
  "71% match",
];

export const AI_MATCH_COUNT = 3;
