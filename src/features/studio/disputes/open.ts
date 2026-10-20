import type { DisputeForm } from "../core/types";
import type { StudioController } from "../core/use-studio";

type DisputeOpening = Omit<DisputeForm, "text" | "files" | "isSending">;

/** the evidence sheet, from Earnings or a past booking, with nothing written yet. */
export const openDispute = (
  { actions }: StudioController,
  opening: DisputeOpening,
) =>
  actions.openSheet("dispute", {
    disputeForm: { ...opening, text: "", files: {}, isSending: false },
  });
