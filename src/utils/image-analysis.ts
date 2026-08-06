import {
  AI_COLOUR_MATCHES,
  AI_MATCH_COUNT,
  AI_STYLE_MATCHES,
  type AiColourMatch,
  type AiStyleMatch,
} from "../data/other/ai-maps";
import {
  DEFAULT_LENGTH_ID,
  LENGTH_OPTIONS,
} from "../data/style-config/lengths";
import type { LengthId } from "../types/styles";

const SAMPLE_SIZE = 80;
const LENGTH_BRIGHTNESS_STEP = 26;

/** Used when the canvas cannot be read at all. */
const FALLBACK_SAMPLE: RgbSample = { red: 128, green: 100, blue: 80 };

export interface RgbSample {
  red: number;
  green: number;
  blue: number;
}

export interface AiResult {
  style: AiStyleMatch;
  colour: AiColourMatch;
  lengthId: LengthId;
  matches: AiStyleMatch[];
}

// ?????? >>
/** Brighter samples read as longer hair, capped at the longest option. */
function lengthFromBrightness(brightness: number): LengthId {
  const index = Math.min(
    LENGTH_OPTIONS.length - 1,
    Math.floor(brightness / LENGTH_BRIGHTNESS_STEP),
  );
  return LENGTH_OPTIONS[index]?.value ?? DEFAULT_LENGTH_ID;
}

/** Rec. 601 luma, matching the original's weighting. */
export function perceivedBrightness({ red, green, blue }: RgbSample): number {
  return Math.round((red * 299 + green * 587 + blue * 114) / 1000);
}

export function averageRgb(data: Uint8ClampedArray): RgbSample {
  let red = 0;
  let green = 0;
  let blue = 0;
  let pixels = 0;

  for (let index = 0; index < data.length; index += 4) {
    red += data[index] ?? 0;
    green += data[index + 1] ?? 0;
    blue += data[index + 2] ?? 0;
    pixels += 1;
  }

  if (pixels === 0) return { red: 0, green: 0, blue: 0 };
  return {
    red: Math.round(red / pixels),
    green: Math.round(green / pixels),
    blue: Math.round(blue / pixels),
  };
}

/** Nearest colour by brightness; ties keep the earlier entry. */
export function nearestColour(brightness: number): AiColourMatch {
  let best = AI_COLOUR_MATCHES[0]!;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of AI_COLOUR_MATCHES) {
    const distance = Math.abs(brightness - candidate.brightness);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

/** Style is picked deterministically from the summed channels, as before. */
export function analyseSample(sample: RgbSample): AiResult {
  const brightness = perceivedBrightness(sample);
  const styleIndex =
    (sample.red + sample.green + sample.blue) % AI_STYLE_MATCHES.length;

  const matches = Array.from(
    { length: AI_MATCH_COUNT },
    (_unused, offset) =>
      AI_STYLE_MATCHES[(styleIndex + offset) % AI_STYLE_MATCHES.length]!,
  );

  return {
    style: matches[0]!,
    colour: nearestColour(brightness),
    lengthId: lengthFromBrightness(brightness),
    matches,
  };
}

/**
 * Samples an image through an 80x80 canvas.
 *
 * The two try blocks are separate on purpose, mirroring the original. If
 * drawImage throws but getImageData succeeds, the canvas is blank and the
 * sample comes back all zeros — which is a different outcome from the
 * 128/100/80 fallback that only applies when getImageData itself throws.
 */
export function sampleImage(image: CanvasImageSource): RgbSample {
  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const context = canvas.getContext("2d");

  try {
    context?.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  } catch {
    // Image not drawable (e.g. cross-origin) — sampling continues below.
  }

  try {
    if (!context) throw new Error("No 2d context");
    const { data } = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    return averageRgb(data);
  } catch {
    // Canvas tainted or unreadable — fall back to mid values.
    return FALLBACK_SAMPLE;
  }
}
