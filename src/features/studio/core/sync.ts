import { SaveError } from "../../../lib/studio-writes";
import type { StudioPatch } from "./types";

/** Saves a real stylist's changes; Studio has already updated the screen, so a failure puts it back. */
export interface StudioSync {
  stylistId: string;
  /** Runs after the ones before it; `onRevert` runs just before the screen is put back. */
  save: (
    task: (stylistId: string) => Promise<unknown>,
    revert: StudioPatch,
    onRevert?: () => void,
  ) => Promise<boolean>;
}

export const createStudioSync = (
  stylistId: string,
  setState: (patch: StudioPatch) => void,
  notify: (message: string) => void,
): StudioSync => {
  // one at a time, so two quick edits to the same rows can't interleave
  let queue = Promise.resolve();

  return {
    stylistId,
    save: (task, revert, onRevert) => {
      const saved = queue
        .then(() => task(stylistId))
        .then(
          () => true,
          (error: unknown) => {
            onRevert?.();
            setState(revert);

            notify(
              error instanceof SaveError
                ? error.message
                : "That change didn’t save. Check your connection and try again.",
            );

            return false;
          },
        );

      queue = saved.then(() => undefined);

      return saved;
    },
  };
};
