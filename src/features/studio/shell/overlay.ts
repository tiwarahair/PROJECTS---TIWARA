import overlay from "../../../styles/features/studio/shell/overlay.module.css";

/** The enter/leave animation for a sheet, side panel or dialog. */
export const getOverlayAnimation = (
  isOut: boolean | undefined,
  kind: "side" | "dialog",
  isWide: boolean,
): string | undefined => {
  if (!isWide) return isOut ? overlay.shDown : overlay.shUp;

  if (kind === "side") return isOut ? overlay.slOut : overlay.slIn;

  return isOut ? overlay.dlgOut : overlay.dlgIn;
};

/** Centred dialog on wide screens, bottom sheet on narrow ones. */
export const getDialogPlacement = (isWide: boolean): string | undefined =>
  isWide ? overlay.dialogWide : overlay.dialogNarrow;
