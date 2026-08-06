import styleConfig from "./style-config.json";
import type { ColourOption, ColourId, StyleConfig } from "../../types/styles";

const STYLE_CONFIG = styleConfig as StyleConfig[];

export const DEFAULT_COLOUR_ID: ColourId = "1B";

export const COLOUR_OPTIONS = (STYLE_CONFIG.find(
  ({ name }) => name === "Colour",
)?.options ?? []) as ColourOption[];

export function findColourById(id: ColourId): ColourOption {
  return (
    COLOUR_OPTIONS.find(({ value }) => value === id) ??
    COLOUR_OPTIONS.find(({ value }) => value === DEFAULT_COLOUR_ID)!
  );
}

// >>>> ummmmm
/**
 * One flat CSS colour for the swatch, for places that cannot take a gradient —
 * the preview's strands and glow. "Other" is deliberately a multi-tone swatch
 * and has no single colour, so it borrows the default.
 */
export const colourSolid = (id: ColourId): string => {
  const { hex } = findColourById(id);
  return hex.startsWith("#") ? hex : findColourById(DEFAULT_COLOUR_ID).hex;
};

/** How far the strand colour is lifted towards the cream. */
const STRAND_LIFT = 0.28;
const CREAM_RGB = { red: 246, green: 240, blue: 228 };

const toRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const lift = (channel: number, target: number) =>
  Math.round(channel + (target - channel) * STRAND_LIFT)
    .toString(16)
    .padStart(2, "0");

/**
 * The strand colour for the drawn preview. The panel behind it is near-black,
 * so an unlifted 1B or Jet Black strand would be invisible — each channel is
 * nudged towards the cream just far enough to read.
 */
export const colourStrand = (id: ColourId): string => {
  const [red, green, blue] = toRgb(colourSolid(id));
  return `#${lift(red, CREAM_RGB.red)}${lift(green, CREAM_RGB.green)}${lift(blue, CREAM_RGB.blue)}`;
};
