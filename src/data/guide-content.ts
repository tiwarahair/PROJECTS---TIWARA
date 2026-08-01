export interface SizeGuideItem {
  name: string;
  description: string;
  /** Number of strands drawn, and how wide each one is in px. */
  strandCount: number;
  strandWidth: number;
  recommended?: boolean;
  badge?: string;
}

export const SIZE_GUIDE_ITEMS: readonly SizeGuideItem[] = [
  {
    name: "Small",
    description:
      "Micro / pencil-width parting. More braids, longer install, delicate finish.",
    strandCount: 6,
    strandWidth: 3,
  },
  {
    name: "Medium",
    description:
      "Standard parting. Full look, great longevity — perfect for most clients.",
    strandCount: 4,
    strandWidth: 7,
    recommended: true,
    badge: "Most popular",
  },
  {
    name: "Large",
    description: "Chunky parting. Bold statement look, quicker install time.",
    strandCount: 3,
    strandWidth: 13,
  },
];

export const SIZE_GUIDE_NOTE =
  "✶ Medium is our most-requested size and recommended for first-time clients. Your stylist will advise at the appointment.";

export const SG_STRAND_HEIGHT = 52;

export interface LengthMarker {
  name: string;
  inches: string;
}

export const LENGTH_MARKERS: readonly LengthMarker[] = [
  { name: "Shoulder", inches: '10–12"' },
  { name: "Bra strap", inches: '14–16"' },
  { name: "Mid-back", inches: '18–20"' },
  { name: "Waist", inches: '22–24"' },
  { name: "Hip", inches: '26–30"' },
];

export const LENGTH_LABELS: readonly LengthMarker[] = [
  { name: "Short", inches: '10–12"' },
  { name: "Medium", inches: '14–18"' },
  { name: "Long", inches: '20–24"' },
  { name: "XL", inches: '26–30"' },
];
