import type { LengthOption, StyleConfig } from "../../types/styles";
import styleConfig from "./style-config.json";

const STYLE_CONFIG = styleConfig as StyleConfig[];

export const LENGTH_OPTIONS = (STYLE_CONFIG.find(
  ({ name }) => name === "Length",
)?.options ?? []) as LengthOption[];

export const DEFAULT_LENGTH_INDEX = 1;

/** Full labels used in the summary and the preview caption. */
export const LENGTHS = LENGTH_OPTIONS.map(
  ({ name, inches }) => `${name} (${inches})`,
);

export function lengthLabel(index: number): string {
  return LENGTHS[index] ?? LENGTHS[DEFAULT_LENGTH_INDEX]!;
}
