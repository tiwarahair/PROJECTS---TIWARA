import type { StrandConfig } from "../types/domain";

const START_X = 30;
const SEGMENT_TOP = 120;
const SEGMENT_BOTTOM = 1000;
const SEGMENT_STEP = 120;

export interface StrandPath {
  pathData: string;
  opacity: number;
}
// TO DO: HMM, I THINK THIS IS FOR THE PIC PLACEHOLDER, REMOVE ALL OF THIS METHINKS

/**
 * 120, 240, … 960. The original looped `y <= 1000` in steps of 120, so it
 * stops at 960 — below the 900-tall viewBox. The strands deliberately overflow
 * and are clipped by preserveAspectRatio="xMidYMid slice".
 */
const SEGMENT_YS: readonly number[] = Array.from(
  { length: Math.floor((SEGMENT_BOTTOM - SEGMENT_TOP) / SEGMENT_STEP) + 1 },
  (_unused, step) => SEGMENT_TOP + step * SEGMENT_STEP,
);

function buildPathData(xPos: number, amp: number, phase: number): string {
  const segments = SEGMENT_YS.map((yPos) => {
    // Direction alternates per 120px band so the strand waves side to side.
    const direction = Math.floor(yPos / SEGMENT_STEP) % 2 === 0 ? 1 : -1;
    const ctrlX = xPos + direction * amp;
    return ` C${ctrlX},${yPos - 90} ${ctrlX},${yPos - 30} ${xPos},${yPos}`;
  });
  // -0 stringifies as "0", so even-index strands start at "M30,0" as before.
  return `M${xPos},${-phase}${segments.join("")}`;
}

/** Geometry for one style's preview strands. Pure — no DOM, no colour. */
export function buildStrandPaths(config: StrandConfig): StrandPath[] {
  return Array.from({ length: config.count }, (_unused, index) => ({
    pathData: buildPathData(
      START_X + index * config.gap,
      config.amp,
      index % 2 === 0 ? 0 : config.phase,
    ),
    opacity: 0.35 + (index % 3) * 0.12,
  }));
}
