import { useCallback, useEffect, useRef, useState } from "react";
import { getSearchParams } from "../../utils/page-flags";

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

/** The share popover's position (null when closed). Any click, Escape or scroll closes it; ?share=open opens and pins it. */
export const useSharePopover = () => {
  const [isPinned] = useState(() => getSearchParams().get("share") === "open");
  const [shareAt, setShareAt] = useState<SharePosition | null>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);

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

    if (!isPinned)
      window.addEventListener("scroll", closeShare, { passive: true });

    return () => {
      document.removeEventListener("click", closeShare);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", closeShare);
    };
  }, [isPinned, closeShare]);

  // after the cover's entrance animation
  useEffect(() => {
    if (!isPinned) return;

    const timer = window.setTimeout(() => {
      if (shareButtonRef.current) openShare(shareButtonRef.current);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [isPinned, openShare]);

  return { shareAt, shareButtonRef, openShare, closeShare };
};
