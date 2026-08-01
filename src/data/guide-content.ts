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
