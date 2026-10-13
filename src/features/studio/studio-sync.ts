import type { StudioPatch } from "./studio-types";

/** Saves a real stylist's changes; Studio has already updated the screen, so a failure puts it back. */
export interface StudioSync {
  stylistId: string;
  /** Runs after the ones before it; `onRevert` runs just before the screen is put back. */
  save: (
    task: (stylistId: string) => Promise<unknown>,
    revert: StudioPatch,
    onRevert?: () => void,
  ) => void;
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
      queue = queue
        .then(() => task(stylistId))
        .then(
          () => undefined,
          () => {
            onRevert?.();
            setState(revert);

            notify(
              "That change didn’t save. Check your connection and try again.",
            );
          },
        );
    },
  };
};
