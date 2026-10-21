import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { readSession, writeSession } from "../utils/page-flags";
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

/** Search remembers its URL and scroll position; returning via Back restores the scroll. */
export const useSearchMemory = (): void => {
  const location = useLocation();
  // the timers and listeners below run outside render, so they read the latest router location from a ref
  const locationRef = useRef(location);

  locationRef.current = location;

  useEffect(() => {
    const record = () => {
      const { pathname, search } = locationRef.current;

      // the router changes the URL before Search unmounts; never record another page as the search
      if (pathname !== "/search") return;

      writeSession(LAST_SEARCH_KEY, pathname + search);

      writeSession(
        SEARCH_SCROLL_KEY,
        JSON.stringify({ search, y: window.scrollY }),
      );
    };

    let scrollTimer = 0;

    const handleScroll = () => {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(record, 120);
    };

    // Coming back via "Back to results": read the saved position before anything records over it (recording
    // first would replace it with 0). The flag is only cleared once the restore has run,
    // so a remount (React StrictMode runs effects twice in development) still restores.
    const isBack = readSession(SEARCH_BACK_KEY) === "1";
    const targetY = isBack ? readSavedScroll() : 0;

    if (!isBack) record();

    const interval = window.setInterval(record, 800);

    window.addEventListener("pagehide", record);
    window.addEventListener("scroll", handleScroll, { passive: true });

    let restoreTimer = 0;

    if (isBack && targetY <= 0) writeSession(SEARCH_BACK_KEY, null);

    if (isBack && targetY > 0) {
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
          writeSession(SEARCH_BACK_KEY, null);

          if (attempts > 3) window.clearInterval(restoreTimer);
        }
      }, 60);
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
