import { useCallback, useEffect } from "react";
import type { DialogState } from "./state";
import type { AccountCore } from "./use-account-core";
import { getFocusables } from "./use-account-feedback";
import type { AccountFeedback } from "./use-account-feedback";

export const useAccountDialogs = (
  { stateRef, setState, forms, refs, returnFocus }: AccountCore,
  { focusLater, startResendCountdown, clearTimers }: AccountFeedback,
) => {
  const closeDialog = useCallback(() => {
    const { dialog } = stateRef.current;

    if (dialog?.kind === "discard") dialog.keep?.();

    forms.card.clearErrors();

    setState({ dialog: null, deleteText: "" }, () => focusLater("returnFocus"));
  }, [focusLater, setState, forms, stateRef]);

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

  // fixtures that start mid-flow: run the resend countdown, focus an open dialog
  useEffect(() => {
    const { resendIn, dialog } = stateRef.current;

    if (resendIn > 0) startResendCountdown();

    if (dialog) focusLater("dialog");

    return clearTimers;
  }, [focusLater, startResendCountdown, stateRef, clearTimers]);

  const openDialog = (dialog: DialogState) => {
    returnFocus.current = document.activeElement;
    setState({ dialog }, () => focusLater("dialog"));
  };

  return { openDialog, closeDialog };
};
