import type { ColourId, HairColour } from "../types/domain";

export const DEFAULT_COLOUR_ID: ColourId = "1b";

/**
 * Braiding Colours
 *
 * `swatch` is the picker tile's background and is deliberately NOT the same
 * value as `strand`, which strokes the SVG preview.
 */
export const COLOURS: readonly HairColour[] = [
  {
    id: "1b",
    name: "1B Natural Black",
    glow: "rgba(38,22,8,0.95)",
    strand: "#2A1A0A",
    swatch: "#1a1108",
  },
  {
    id: "4",
    name: "4 Dark Brown",
    glow: "rgba(80,42,8,0.9)",
    strand: "#5A3010",
    swatch: "#3d2000",
  },
  {
    id: "30",
    name: "30 Auburn",
    glow: "rgba(140,62,15,0.85)",
    strand: "#9A5020",
    swatch: "#7a3800",
  },
  {
    id: "27",
    name: "27 Honey Blonde",
    glow: "rgba(180,115,30,0.75)",
    strand: "#C08030",
    swatch: "#c07820",
  },
  {
    id: "613",
    name: "613 Platinum",
    glow: "rgba(200,175,60,0.65)",
    strand: "#C8A840",
    swatch: "#d4c050",
  },
  {
    id: "ombre",
    name: "Ombre",
    glow: "rgba(100,50,15,0.8)",
    strand: "#7A4018",
    swatch: "linear-gradient(135deg, #1a1108 50%, #7a3800 50%)",
  },
  {
    id: "burgundy",
    name: "Burgundy",
    glow: "rgba(110,16,16,0.9)",
    strand: "#6A1010",
    swatch: "#5a0808",
  },
];

/* Short text shown on the swatch tile itself. */
export const COLOUR_SWATCH_LABELS: Readonly<Record<ColourId, string>> = {
  "1b": "1B Black",
  "4": "4 Brown",
  "30": "30 Auburn",
  "27": "27 Honey",
  "613": "613 Platinum",
  ombre: "Ombre",
  burgundy: "Burgundy",
};

export const findColourById = (id: ColourId): HairColour =>
  COLOURS.find((colour) => colour.id === id) ??
  COLOURS.find((colour) => colour.id === DEFAULT_COLOUR_ID)!;
