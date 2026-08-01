export type OverlayId =
  | "search"
  | "profile"
  | "booking"
  | "aiDiscovery"
  | "sizeGuide"
  | "lengthGuide";

export type Overlays = Record<OverlayId, boolean>;

/**
 * Escape closes the topmost open overlay. This is a fixed priority list rather
 * than a stack, matching the original's if/else chain, and it happens to run in
 * descending z-index order (1000, 1000, 900, 700, 600, 500).
 */
export const ESCAPE_PRIORITY: readonly OverlayId[] = [
  "sizeGuide",
  "lengthGuide",
  "booking",
  "aiDiscovery",
  "profile",
  "search",
];
