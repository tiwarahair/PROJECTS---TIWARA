// What the settings pages share for saving: a stylist-row save and the "Discard changes?" baseline.
import { updateStylist } from "../../../lib/studio-api/settings";
import type { TablesUpdate } from "../../../types/database";
import type { StudioPatch } from "../core/types";
import type { StudioController } from "../core/use-studio";

export const getSettingsSave = ({ context }: StudioController) => {
  const { sync } = context;

  const saveStylist = (
    patch: TablesUpdate<"stylists">,
    revert: StudioPatch,
    onRevert?: () => void,
  ) =>
    sync.save((stylistId) => updateStylist(stylistId, patch), revert, onRevert);

  // what Save stores becomes the baseline for "Discard changes?"; a failed save puts the old one back
  const markSaved = (
    patch: Partial<NonNullable<typeof context.memo.saved>>,
  ) => {
    const saved = context.memo.saved;

    if (saved) context.memo.saved = { ...saved, ...patch };

    return {
      saved,
      restoreSaved: () => {
        context.memo.saved = saved;
      },
    };
  };

  return { sync, saveStylist, markSaved };
};
