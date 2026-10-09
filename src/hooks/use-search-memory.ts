import { useEffect } from "react";
import { isBoardView, readSession, writeSession } from "../utils/page-flags";
import {
  LAST_SEARCH_KEY,
  SEARCH_BACK_KEY,
  SEARCH_SCROLL_KEY,
} from "../utils/last-search";

const readSavedScroll = (): number => {
  try {
    const saved = JSON.parse(readSession(SEARCH_SCROLL_KEY) || "null") as {
      y?: number;
    } | null;
    return saved?.y ?? 0;
  } catch {
    return 0;
  }
};

/** Search remembers its URL and scroll position; returning via Back restores the scroll (prototype tw-fav.js). */
export const useSearchMemory = (): void => {
  useEffect(() => {
    if (isBoardView()) return;
    const record = () => {
      writeSession(
        LAST_SEARCH_KEY,
        window.location.pathname + window.location.search,
      );
      writeSession(
        SEARCH_SCROLL_KEY,
        JSON.stringify({ u: window.location.search, y: window.scrollY }),
      );
    };
    let scrollTimer = 0;
    const handleScroll = () => {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(record, 120);
    };
    record();
    const interval = window.setInterval(record, 800);
    window.addEventListener("pagehide", record);
    window.addEventListener("scroll", handleScroll, { passive: true });

    let restoreTimer = 0;
    if (readSession(SEARCH_BACK_KEY) === "1") {
      writeSession(SEARCH_BACK_KEY, null);
      const targetY = readSavedScroll();
      if (targetY > 0) {
        let attempts = 0;
        // wait for results to render tall enough, then restore
        restoreTimer = window.setInterval(() => {
          attempts++;
          if (
            document.documentElement.scrollHeight >=
              targetY + window.innerHeight * 0.5 ||
            attempts > 40
          ) {
            window.scrollTo(0, targetY);
            if (attempts > 3) window.clearInterval(restoreTimer);
          }
        }, 60);
      }
    }
    // no final record on unmount: the router has already moved to the next URL by then
    return () => {
      window.clearInterval(interval);
      window.clearInterval(restoreTimer);
      window.clearTimeout(scrollTimer);
      window.removeEventListener("pagehide", record);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
};
