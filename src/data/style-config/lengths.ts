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
