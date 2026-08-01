import { useEffect, useState } from "react";

const SCROLL_THRESHOLD = 60;

/**
 * True once the page is scrolled past `threshold`.
 *
 * Deliberately starts false rather than reading window.scrollY up front: the
 * original only applied `.scrolled` on the first scroll event, so a page
 * restored partway down renders unscrolled until the user moves.
 */
export function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > SCROLL_THRESHOLD);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [SCROLL_THRESHOLD]);
  return scrolled;
}
