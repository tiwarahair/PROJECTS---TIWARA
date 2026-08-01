import type { ColourId, HairColour } from "../types/domain";

export const DEFAULT_COLOUR_ID: ColourId = "1b";

/**
 * Ordered to match the swatch grid.
 *
 * `swatch` is the picker tile's background and is deliberately NOT the same
 * value as `strand`, which strokes the SVG preview. `title` is the tooltip and
 * differs from `name` for the mixed shades.
 */
export const COLOURS: readonly HairColour[] = [
  {
    id: "1b",
    name: "1B Natural Black",
    title: "1B Natural Black",
    label: "1B",
    glow: "rgba(38,22,8,0.95)",
    strand: "#2A1A0A",
    swatch: "#1A1108",
  },
  {
    id: "30",
    name: "30 Auburn",
    title: "30 Auburn",
    label: "30",
    glow: "rgba(140,62,15,0.85)",
    strand: "#9A5020",
    swatch: "#7A3800",
  },
  {
    id: "4/33",
    name: "4/33 Dark Brown Mix",
    title: "4/33 Dark Brown / Burgundy",
    label: "4/33",
    glow: "rgba(90,16,16,0.88)",
    strand: "#5A1010",
    swatch: "linear-gradient(135deg,#3D2000 50%,#8F1112 50%)",
  },
  {
    id: "613",
    name: "613 Platinum Blonde",
    title: "613 Platinum Blonde",
    label: "613",
    glow: "rgba(200,175,60,0.65)",
    strand: "#C8A840",
    swatch: "#D4C050",
  },
  {
    id: "other",
    name: "Other colour",
    title: "Other — specify in notes",
    label: "Other",
    glow: "rgba(80,50,20,0.8)",
    strand: "#7A4018",
    swatch:
      "linear-gradient(135deg,#1A1108 25%,#7A3800 25% 50%,#D4C050 50% 75%,#3D2000 75%)",
  },
];

export function findColourById(id: ColourId): HairColour {
  return (
    COLOURS.find((colour) => colour.id === id) ??
    COLOURS.find((colour) => colour.id === DEFAULT_COLOUR_ID)!
  );
}
