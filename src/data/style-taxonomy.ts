import type { StyleTaxonomyEntry } from "../types/content";
import type { ServiceCategoryKey } from "../types/domain";

// TO DO: READ THROUGH

/**
 * The five service categories, in one place. The original markup repeated this
 * taxonomy six times — hero <select>, hero chips, service cards, search
 * <select>, search chips and the footer Styles column — which is how the
 * labels came to differ between them.
 *
 * The three label variants are all real and all preserved: the hero chips say
 * "Wig Installs" where the search chips say "Wigs".
 *
 * This order is the one used by both <select>s and the footer.
 */
export const STYLE_TAXONOMY: readonly StyleTaxonomyEntry[] = [
  {
    key: "braids",
    selectLabel: "Braids & Protective Styles",
    chipLabel: "Braids",
    filterLabel: "Braids",
  },
  {
    key: "wigs",
    selectLabel: "Wig Installs",
    chipLabel: "Wig Installs",
    filterLabel: "Wigs",
  },
  {
    key: "natural",
    selectLabel: "Natural Hair Care",
    chipLabel: "Natural Hair",
    filterLabel: "Natural",
  },
  {
    key: "locs",
    selectLabel: "Locs & Twists",
    chipLabel: "Locs & Twists",
    filterLabel: "Locs",
  },
  {
    key: "treatments",
    selectLabel: "Treatments",
    chipLabel: "Treatments",
    filterLabel: "Treatments",
  },
];

/**
 * Chips run in a different order to the <select>s — locs before natural.
 * Shared by the hero chips and the search filter chips.
 */
export const CHIP_ORDER: readonly ServiceCategoryKey[] = [
  "braids",
  "wigs",
  "locs",
  "natural",
  "treatments",
];

/** The two empty-value labels differ between the hero and the search overlay. */
export const ANY_STYLE_LABEL = "Any style";
export const ALL_STYLES_LABEL = "All styles";

export function taxonomyEntry(
  key: ServiceCategoryKey,
): StyleTaxonomyEntry | undefined {
  return STYLE_TAXONOMY.find((entry) => entry.key === key);
}
