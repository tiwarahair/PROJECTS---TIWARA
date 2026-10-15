import { getAssetSources } from "./asset-url";

/** Widths saved beside every uploaded cover and portfolio photo. */
export const UPLOAD_WIDTHS = [400, 800, 1200];

const UPLOAD_ORIGINAL = /-full\.jpg$/;

/** "…/cover-123-full.jpg" → "…/cover-123-800.webp": where an upload's copy at that width lives. */
export const toUploadVariant = (
  original: string,
  width: number,
  extension: "webp" | "jpg",
) => original.replace(UPLOAD_ORIGINAL, `-${width}.${extension}`);

export const isUploadOriginal = (path: string) => UPLOAD_ORIGINAL.test(path);

export interface ImageSources {
  avif?: string;
  webp?: string;
  fallback: string;
  src: string;
  width?: number;
  height?: number;
}

/** srcset lists for a bundled photo or an uploaded one with copies; null for anything else (old uploads, previews). */
export const getImageSources = (src: string): ImageSources | null => {
  const assetSources = getAssetSources(src);

  if (assetSources) return assetSources;

  if (!isUploadOriginal(src)) return null;

  const toSrcSet = (extension: "webp" | "jpg") =>
    UPLOAD_WIDTHS.map(
      (width) => `${toUploadVariant(src, width, extension)} ${width}w`,
    ).join(", ");

  return { webp: toSrcSet("webp"), fallback: toSrcSet("jpg"), src };
};

/** How wide the profile cover shows; shared so a card can preload the same file the profile then uses. */
export const PROFILE_COVER_SIZES = "(max-width: 1040px) 100vw, 1040px";
