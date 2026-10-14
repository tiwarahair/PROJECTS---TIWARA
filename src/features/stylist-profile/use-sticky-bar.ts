import { useEffect, useRef, useState } from "react";
import { getSearchParams } from "../../utils/page-flags";

/** The mobile sticky bar shows once the hero scrolls away (?sticky=1 pins it on). */
export const useStickyBar = () => {
  const [isPinned] = useState(() => getSearchParams().get("sticky") === "1");
  const [isShown, setIsShown] = useState(isPinned);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = heroRef.current;

    if (!hero || !window.IntersectionObserver || isPinned) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsShown(!entry?.isIntersecting && window.innerWidth <= 720);
    });

    observer.observe(hero);

    return () => observer.disconnect();
  }, [isPinned]);

  return { heroRef, isShown };
};
