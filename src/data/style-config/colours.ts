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
