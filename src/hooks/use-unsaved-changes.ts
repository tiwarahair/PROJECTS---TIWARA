import { useEffect } from "react";
import { useBlocker } from "react-router";

/** The wording every "Discard changes?" prompt uses. */
export const DISCARD_PROMPT = {
  title: "Discard changes?",
  body: "You have unsaved changes. If you leave now, they won’t be saved.",
  discard: "Discard",
  keep: "Keep editing",
};

/**
 * Warns before unsaved edits are lost: the browser's own prompt on reload or tab close, and a blocker for
 * route changes (the host shows its discard dialog while `blocker.state` is "blocked"). Back and forward
 * are blocked too, since they can change the section a page shows.
 */
export const useUnsavedChanges = (hasUnsaved: () => boolean) => {
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (hasUnsaved()) event.preventDefault();
    };

    window.addEventListener("beforeunload", warn);

    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsaved]);

  return useBlocker(
    ({ currentLocation, nextLocation, historyAction }) =>
      hasUnsaved() &&
      (currentLocation.pathname !== nextLocation.pathname ||
        historyAction === "POP"),
  );
};
