import { useCallback, useEffect } from "react";
import type { DialogState } from "./state";
import type { AccountCore } from "./use-core";
import { getFocusables } from "./use-feedback";
import type { AccountFeedback } from "./use-feedback";

export const useAccountDialogs = (
  { stateRef, setState, refs, returnFocus }: AccountCore,
  { focusLater, clearTimers }: AccountFeedback,
) => {
  const closeDialog = useCallback(() => {
    const { dialog } = stateRef.current;

    if (dialog?.kind === "discard") dialog.keep?.();

    setState({ dialog: null, deleteText: "" }, () => focusLater("returnFocus"));
  }, [focusLater, setState, stateRef]);

  // Escape closes the dialog (Tab stays inside it), then the address menu, then the mobile menu
  useEffect(() => {
    const handleKey = (event: globalThis.KeyboardEvent) => {
      const current = stateRef.current;

      if (current.dialog) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeDialog();

          return;
        }

        if (event.key === "Tab") {
          const dialog = refs.dialog.current;

          if (!dialog) return;

          const elements = getFocusables(dialog);
          const first = elements[0];
          const last = elements[elements.length - 1];

          if (!first || !last) return;

          if (!dialog.contains(document.activeElement)) {
            event.preventDefault();
            first.focus();
          } else if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }

        return;
      }

      if (event.key === "Escape" && current.addressMenu)
        setState({ addressMenu: null });
    };

    document.addEventListener("keydown", handleKey);

    return () => document.removeEventListener("keydown", handleKey);
  }, [closeDialog, refs, setState, stateRef]);

  useEffect(() => clearTimers, [clearTimers]);

  const openDialog = (dialog: DialogState) => {
    returnFocus.current = document.activeElement;
    setState({ dialog }, () => focusLater("dialog"));
  };

  return { openDialog, closeDialog };
};
