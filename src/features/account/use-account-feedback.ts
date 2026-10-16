import { useCallback } from "react";
import { TOAST_MS } from "./state";
import type { AccountCore } from "./use-account-core";

export const getFocusables = (root: HTMLElement) =>
  [
    ...root.querySelectorAll<HTMLElement>(
      'button:not([disabled]),a[href],input,textarea,select,[tabindex]:not([tabindex="-1"])',
    ),
  ].filter((element) => element.offsetParent !== null);

export const useAccountFeedback = ({
  stateRef,
  setState,
  forms,
  refs,
  returnFocus,
  toastTimer,
  resendTimer,
}: AccountCore) => {
  const focusDialog = useCallback(() => {
    const dialog = refs.dialog.current;

    if (!dialog) return;

    const elements = getFocusables(dialog);

    const preferred = dialog.querySelector<HTMLElement>(
      "input:not([type=checkbox])",
    );

    (preferred || elements[1] || elements[0] || dialog).focus();
  }, [refs]);

  /** Focus after the render settles. */
  const focusLater = useCallback(
    (target: string) => {
      window.setTimeout(() => {
        const current = stateRef.current;

        if (target === "title")
          document.getElementById("ac-title")?.focus({ preventScroll: true });

        if (target.startsWith("row:"))
          document.getElementById(`ac-row-${target.slice(4)}`)?.focus();

        if (target === "dialog") focusDialog();

        if (target === "returnFocus") {
          const element = returnFocus.current as HTMLElement | null;

          if (element?.focus && document.contains(element)) element.focus();
        }

        if (target === "edit")
          forms.edit.setFocus(
            ({ name: "first", email: "email", mobile: "mobile" } as const)[
              current.edit ?? "name"
            ],
          );

        if (target === "code") refs.code[0]?.current?.focus();

        if (target === "password")
          forms.password.setFocus(current.password.has ? "current" : "next");

        if (target === "address") forms.address.setFocus("label");
      }, 40);
    },
    [focusDialog, refs, forms, stateRef, returnFocus],
  );

  const showToast = useCallback(
    (toast: string) => {
      window.clearTimeout(toastTimer.current);
      // clear first so screen readers announce a repeated message
      setState({ toast: "" }, () => setState({ toast }));

      toastTimer.current = window.setTimeout(
        () => setState({ toast: "" }),
        TOAST_MS,
      );
    },
    [setState, toastTimer],
  );

  const startResendCountdown = useCallback(() => {
    window.clearInterval(resendTimer.current);

    resendTimer.current = window.setInterval(
      () =>
        setState((current) => {
          if (current.resendIn <= 1) window.clearInterval(resendTimer.current);

          return { resendIn: Math.max(0, current.resendIn - 1) };
        }),
      1000,
    );
  }, [setState, resendTimer]);

  const stopResendCountdown = () => window.clearInterval(resendTimer.current);

  const clearTimers = useCallback(() => {
    window.clearTimeout(toastTimer.current);
    window.clearInterval(resendTimer.current);
  }, [toastTimer, resendTimer]);

  return {
    focusLater,
    showToast,
    startResendCountdown,
    stopResendCountdown,
    clearTimers,
  };
};

export type AccountFeedback = ReturnType<typeof useAccountFeedback>;
