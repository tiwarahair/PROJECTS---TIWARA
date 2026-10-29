import { useEffect } from "react";
import type { RefObject } from "react";

const FOCUSABLE =
  "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href]";

/** Tab and Shift+Tab loop through a dialog's own controls, never the page behind it. */
export const useFocusLoop = (box: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !box.current) return;

      const controls = [
        ...box.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ].filter(({ tabIndex }) => tabIndex >= 0);

      const first = controls[0];
      const last = controls.at(-1);

      if (!first || !last) return;

      const isLeaving = event.shiftKey
        ? document.activeElement === first
        : document.activeElement === last;

      if (isLeaving || !box.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };

    window.addEventListener("keydown", handleKey, true);

    return () => window.removeEventListener("keydown", handleKey, true);
  }, [box]);
};
