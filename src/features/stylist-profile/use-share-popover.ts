import { useCallback, useEffect, useState } from "react";

export interface SharePosition {
  top: string;
  right: string;
}

/** 8px under the button, right-aligned to it, at least 12px from the viewport edge. */
const getSharePosition = (element: Element): SharePosition => {
  const { bottom, right } = element.getBoundingClientRect();

  return {
    top: `${Math.round(bottom + 8)}px`,
    right: `${Math.max(12, Math.round(window.innerWidth - right))}px`,
  };
};

/** The share popover's position (null when closed). Any click, Escape or scroll closes it. */
export const useSharePopover = () => {
  const [shareAt, setShareAt] = useState<SharePosition | null>(null);

  const openShare = useCallback(
    (element: Element) => setShareAt(getSharePosition(element)),
    [],
  );

  const closeShare = useCallback(() => setShareAt(null), []);

  useEffect(() => {
    const handleKey = ({ key }: KeyboardEvent) => {
      if (key === "Escape") closeShare();
    };

    document.addEventListener("click", closeShare);
    window.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", closeShare, { passive: true });

    return () => {
      document.removeEventListener("click", closeShare);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", closeShare);
    };
  }, [closeShare]);

  return { shareAt, openShare, closeShare };
};
