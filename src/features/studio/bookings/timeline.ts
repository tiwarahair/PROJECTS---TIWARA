import type { MouseEvent } from "react";
import { hexWithAlpha, timeToMinutes } from "../core/format";
import {
  getBlockColour,
  getBlockRange,
  getWorkingHours,
  isBlockOn,
} from "../core/model";
import type { StudioState } from "../core/types";
import type { StudioController } from "../core/use-studio";
import type { DecoratedBooking } from "./decorate";
import { END_MINUTES, POP_SIZE } from "./types";

type WorkingHours = ReturnType<typeof getWorkingHours>;

export const getTimeToPixels = (pixelsPerHour: number) => (minutes: number) =>
  (minutes / 60) * pixelsPerHour;

const clampMinutes = (minutes: number) =>
  Math.min(Math.max(minutes, 0), END_MINUTES);

export const toPixels = (pixels: number) => `${pixels.toFixed(0)}px`;

export const getHourLabel = (hour: number) =>
  hour === 24 ? "" : `${String(hour).padStart(2, "0")}:00`;

export const isOutsideHours = (
  { on, start, end }: WorkingHours,
  minutes: number,
) => !on || minutes < timeToMinutes(start) || minutes >= timeToMinutes(end);

export const getOffBands = (
  state: StudioState,
  offset: number,
  getTop: (minutes: number) => number,
) => {
  const hours = getWorkingHours(state, offset);

  const band = (from: number, to: number) => {
    const top = getTop(clampMinutes(from));
    const height = getTop(clampMinutes(to)) - top;

    return height > 1 ? { top: toPixels(top), height: toPixels(height) } : null;
  };

  const bands = hours.on
    ? [
        band(0, timeToMinutes(hours.start)),
        band(timeToMinutes(hours.end), END_MINUTES),
      ]
    : [band(0, END_MINUTES)];

  return bands.filter((item) => item !== null);
};

export const getBlocked = (
  { state, actions }: StudioController,
  offset: number,
  getTop: (minutes: number) => number,
  minHeight: number,
) =>
  state.blocked
    .filter((block) => isBlockOn(block, offset))
    .map((block) => {
      const [from, to] = getBlockRange(state, block, offset);
      const top = getTop(clampMinutes(from));
      const height = getTop(clampMinutes(to)) - top;
      const colour = getBlockColour();

      return {
        key: block.id,
        top: toPixels(top + 1),
        height: toPixels(Math.max(minHeight, height - 3)),
        hex: colour.foreground || colour.hex,
        line: hexWithAlpha(colour.hex, 0.45),
        background: hexWithAlpha(colour.hex, 0.16),
        label:
          (block.reason || "Blocked").replace(/( · )?Repeats.*$/, "") +
          (block.span === "All day" ? " · All day" : ""),
        open: (event: MouseEvent) => {
          event.stopPropagation();
          actions.blockPop(block, event);
        },
      };
    });

export const getTappedMinutes = (quarter: number) =>
  Math.min(23 * 60 + 45, Math.max(0, quarter * 15));

// anchor to the pointer, kept inside the viewport
export const getPopPosition = ({ clientX, clientY }: MouseEvent) => {
  const { width, height, pad } = POP_SIZE;

  return {
    x: Math.min(Math.max(pad, clientX + 6), window.innerWidth - width - pad),
    y: Math.min(Math.max(pad, clientY + 6), window.innerHeight - height - pad),
  };
};

/** A booking's tile colours as custom properties (runtime: from its service category and status). */
export const getBlockTone = (booking: DecoratedBooking) => ({
  "--bk-bg": booking.tileBackground,
  "--bk-bar": booking.tileBar,
  "--bk-line": booking.tileLine,
  "--bk-dash": booking.tileBorder,
  "--bk-text": booking.tileText,
  "--bk-meta": booking.tileMeta,
  "--badge-bg": booking.badgeBackground,
  "--badge-border": booking.badgeBorder,
  "--badge-color": booking.badgeColor,
});
