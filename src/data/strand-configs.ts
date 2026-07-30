import type { StrandConfig } from "../types/domain";

export const DEFAULT_STRAND_STYLE = "knotless";

// TO DO: HMM, I THINK THIS IS FOR THE PIC PLACEHOLDER, REMOVE ALL OF THIS METHINKS

/**
 * Preview geometry per style id. `box` was dropped — no style with that id
 * exists in any category, so it was unreachable.
 */
export const STRAND_CONFIGS: Readonly<Record<string, StrandConfig>> = {
  knotless: { count: 8, gap: 65, amp: 14, width: 5, phase: 8 },
  fulani: { count: 7, gap: 72, amp: 16, width: 7, phase: 10 },
  cornrows: { count: 10, gap: 52, amp: 7, width: 3, phase: 0 },
  feedin: { count: 7, gap: 72, amp: 14, width: 6, phase: 8 },
  stitch: { count: 9, gap: 58, amp: 10, width: 4, phase: 5 },
  lacefront: { count: 4, gap: 130, amp: 28, width: 16, phase: 0 },
  fulllace: { count: 5, gap: 105, amp: 26, width: 14, phase: 10 },
  "360": { count: 5, gap: 105, amp: 24, width: 13, phase: 5 },
  custom: { count: 4, gap: 130, amp: 28, width: 16, phase: 15 },
  washstyle: { count: 5, gap: 105, amp: 24, width: 10, phase: 0 },
  blowout: { count: 4, gap: 130, amp: 34, width: 12, phase: 0 },
  twistout: { count: 6, gap: 85, amp: 20, width: 9, phase: 0 },
  silkpress: { count: 4, gap: 130, amp: 28, width: 10, phase: 5 },
  starterlocs: { count: 5, gap: 105, amp: 20, width: 15, phase: 0 },
  twostrand: { count: 6, gap: 85, amp: 22, width: 11, phase: 0 },
  senegalese: { count: 6, gap: 85, amp: 18, width: 9, phase: 10 },
  marley: { count: 5, gap: 105, amp: 22, width: 13, phase: 0 },
  retwist: { count: 5, gap: 105, amp: 18, width: 13, phase: 5 },
  deepcond: { count: 3, gap: 175, amp: 32, width: 20, phase: 0 },
  scalp: { count: 3, gap: 175, amp: 28, width: 18, phase: 10 },
  protein: { count: 3, gap: 175, amp: 32, width: 20, phase: 5 },
  hotoil: { count: 3, gap: 175, amp: 28, width: 18, phase: 0 },
};

/** Unknown or not-yet-chosen styles fall back to knotless, as before. */
export function strandConfigFor(styleId: string | null): StrandConfig {
  const config = styleId ? STRAND_CONFIGS[styleId] : undefined;
  return config ?? STRAND_CONFIGS[DEFAULT_STRAND_STYLE]!;
}
