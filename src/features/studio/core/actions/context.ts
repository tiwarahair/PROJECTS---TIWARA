import type { getSteps } from "../model";
import type { StudioSync } from "../sync";
import type { SavedSettings } from "../unsaved";
import type { StudioPatch, StudioState } from "../types";

export interface StudioContext {
  getState: () => StudioState;
  setState: (patch: StudioPatch) => void;
  /** setState without the "Discard changes?" check, for leaving a page after saving it. */
  applyState: (patch: StudioPatch) => void;
  /** Saves a real stylist's changes; null on demo boards. */
  sync: StudioSync | null;
  timers: Record<string, number>;
  /** Values kept between renders (seen setup steps, the clash override, the last pointer type). */
  memo: {
    saveSlug?: () => Promise<boolean>;
    /** What a confirmed app code goes on to (e.g. back to Stripe). */
    afterSecondFactor?: () => void;
    enrolmentRequest?: number;
    seenDone?: ReturnType<typeof getSteps>;
    clashOk?: boolean;
    lastPointer?: string;
    tipListening?: boolean;
    swipe?: { x: number; y: number } | null;
    slideFrame?: number;
    applyEdit?: () => void;
    cancelBooking?: () => void;
    applyReschedule?: () => void;
    setChangeClient?: (id: string | null) => void;
    saveAddonEdit?: (draft: NonNullable<StudioState["addonEdit"]>) => void;
    removeAddonEdit?: (id: string) => void;
    statusItems?: {
      label: string;
      d: string;
      subtitle?: string;
      disabled?: boolean;
      danger?: boolean;
      run: () => void;
    }[];
    calendarKey?: string;
    weekScrollTarget?: number;
    weekScrolledKey?: string | null;
    locked?: boolean;
    weekKey?: number;
    saved?: SavedSettings;
    isSlugEdited?: boolean;
    isTaxEdited?: boolean;
    sheetDraft?: string;
    policyApi?: { canSave: boolean; isDirty: boolean; save: () => void };
    accountApi?: { canSave: boolean; save: () => void; discard: () => void };
    businessApi?: { canSave: boolean; save: () => void };
  };
  isWide: () => boolean;
}

export const clear = (timers: Record<string, number>, key: string) =>
  window.clearTimeout(timers[key]);
