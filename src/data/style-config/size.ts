import type { SizeOption, StyleConfig } from "../../types/styles";
import styleConfig from "./style-config.json";

const STYLE_CONFIG = styleConfig as StyleConfig[];

export const SIZE_OPTIONS = (STYLE_CONFIG.find(({ name }) => name === "Size")
  ?.options ?? []) as SizeOption[];
