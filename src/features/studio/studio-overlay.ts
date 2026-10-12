import overlay from "./studio-overlay.module.css";

/** The enter/leave animation for a sheet, side panel or dialog (prototype ovAnim). */
export const getOverlayAnimation = (
  isOut: boolean | undefined,
  kind: "side" | "dialog",
  isWide: boolean,
): string | undefined => {
  if (!isWide) return isOut ? overlay.shDown : overlay.shUp;

  if (kind === "side") return isOut ? overlay.slOut : overlay.slIn;

  return isOut ? overlay.dlgOut : overlay.dlgIn;
};

/** Centred dialog on wide screens, bottom sheet on narrow ones (prototype dg*). */
export const getDialogPlacement = (isWide: boolean): string | undefined =>
  isWide ? overlay.dialogWide : overlay.dialogNarrow;

/** Side panel on wide screens, full-width sheet on narrow ones (prototype ov*). */
export const getPanelPlacement = (isWide: boolean): string | undefined =>
  isWide ? overlay.panelWide : overlay.panelNarrow;
