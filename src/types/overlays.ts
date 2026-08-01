export type OverlayId =
  | "search"
  | "profile"
  | "booking"
  | "aiDiscovery"
  | "otherStyle"
  | "hairQuiz"
  | "about"
  | "stylists"
  | "shop"
  | "sizeGuide";

export type Overlays = Record<OverlayId, boolean>;

/**
 * The full-page overlays that open and close with nothing else attached, so
 * they share one pair of generic actions instead of a reducer each.
 */
export type SimpleOverlayId =
  "otherStyle" | "hairQuiz" | "about" | "stylists" | "shop";

/**
 * Escape closes the topmost open overlay. This is a fixed priority list rather
 * than a stack, matching the original's if/else chain.
 *
 * Note aiDiscovery sits above otherStyle and hairQuiz here even though its
 * z-index is lower — that is the order the new-ui branch chose, and the two
 * are never open together in practice.
 */
export const ESCAPE_PRIORITY: readonly OverlayId[] = [
  "sizeGuide",
  "booking",
  "aiDiscovery",
  "otherStyle",
  "hairQuiz",
  "about",
  "stylists",
  "shop",
  "profile",
  "search",
];

/** Overlays that cover the page and therefore lock body scrolling. */
export const SCROLL_LOCKING: readonly OverlayId[] = [
  "search",
  "profile",
  "booking",
  "aiDiscovery",
  "otherStyle",
  "hairQuiz",
  "about",
  "stylists",
  "shop",
];
