import { DEFAULT_COLOUR_ID } from "../../data/style-config/colours";
import type { ColourId, LengthId } from "../../types/styles";

/**
 * Real photography for the preview panel, keyed `{lengthId}-{colourId}`.
 *
 * A glob rather than 19 imports: it keys off the resolved path, so the lookup
 * cannot drift from the filenames on disk. `?url` keeps only the URL strings in
 * the bundle, so the browser fetches just the variant actually on screen.
 */
const PHOTO_URLS = import.meta.glob<string>("../../assets/knotless-*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

/** Only knotless has photography so far; every other style falls back. */
const PHOTOGRAPHED_STYLE_ID = "knotless";

const byVariant = new Map<string, string>();
for (const [path, url] of Object.entries(PHOTO_URLS)) {
  const variant = path
    .split("/")
    .pop()
    ?.replace(/^knotless-|\.webp$/g, "");
  if (variant) byVariant.set(variant, url);
}

const variantKey = (lengthId: LengthId, colourId: ColourId) =>
  `${lengthId}-${colourId.toLowerCase()}`;

/**
 * Stands in before a style has been chosen, so the panel is never an empty
 * black rectangle on the way through the early steps.
 */
const DEFAULT_PHOTO = byVariant.get("shoulder-1b") ?? null;

/**
 * The photo for a look, or null when there is none — Jet Black and "Other"
 * have no shoot, and neither does shoulder-length in 33, so those fall back to
 * the same length in the default colour rather than showing nothing.
 */
export const getStylePhoto = (
  serviceId: string | null,
  styleId: string | null,
  lengthId: LengthId,
  colourId: ColourId,
): string | null => {
  if (!serviceId) return null;
  if (!styleId && serviceId === "braids") return DEFAULT_PHOTO;
  if (styleId !== PHOTOGRAPHED_STYLE_ID) return null;
  return (
    byVariant.get(variantKey(lengthId, colourId)) ??
    byVariant.get(variantKey(lengthId, DEFAULT_COLOUR_ID)) ??
    null
  );
};
