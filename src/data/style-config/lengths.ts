import type { LengthId, LengthOption, StyleConfig } from "../../types/styles";
import styleConfig from "./style-config.json";

const STYLE_CONFIG = styleConfig as StyleConfig[];

export const LENGTH_OPTIONS = (STYLE_CONFIG.find(
  ({ name }) => name === "Length",
)?.options ?? []) as LengthOption[];

export const DEFAULT_LENGTH_ID: LengthId = "shoulder";

export const findLengthById = (id: LengthId): LengthOption =>
  LENGTH_OPTIONS.find(({ value }) => value === id) ??
  LENGTH_OPTIONS.find(({ value }) => value === DEFAULT_LENGTH_ID)!;

/** Full label used in the summary and the preview caption. */
export const lengthLabel = (id: LengthId): string => {
  const { name, inches } = findLengthById(id);
  return `${name} (${inches})`;
};

// ??? >>>>
/**
 * Position in the catalogue order. The preview's length bar fills every
 * segment up to the chosen one, so it needs the rank rather than the id.
 */
export const getLengthIndex = (id: LengthId): number => {
  const index = LENGTH_OPTIONS.findIndex(({ value }) => value === id);
  return index === -1
    ? LENGTH_OPTIONS.findIndex(({ value }) => value === DEFAULT_LENGTH_ID)
    : index;
};
