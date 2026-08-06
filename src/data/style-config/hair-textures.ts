import type {
  HairTextureId,
  HairTextureOption,
  StyleConfig,
} from "../../types/styles";
import styleConfig from "./style-config.json";

const STYLE_CONFIG = styleConfig as StyleConfig[];

export const HAIR_TEXTURE_OPTIONS = (STYLE_CONFIG.find(
  ({ name }) => name === "Hair Texture",
)?.options ?? []) as HairTextureOption[];

export const DEFAULT_HAIR_TEXTURE_ID: HairTextureId = "straight";

export const findHairTextureById = (id: HairTextureId): HairTextureOption =>
  HAIR_TEXTURE_OPTIONS.find(({ value }) => value === id) ??
  HAIR_TEXTURE_OPTIONS.find(({ value }) => value === DEFAULT_HAIR_TEXTURE_ID)!;

export const hairTextureLabel = (id: HairTextureId): string =>
  findHairTextureById(id).name;
