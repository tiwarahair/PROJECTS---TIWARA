import { useEffect, useRef, useState } from "react";

/** The mobile sticky bar shows once the hero scrolls away. */
export const useStickyBar = () => {
  const [isShown, setIsShown] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = heroRef.current;

    if (!hero || !window.IntersectionObserver) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsShown(!entry?.isIntersecting && window.innerWidth <= 720);
    });

    observer.observe(hero);

    return () => observer.disconnect();
  }, []);

  return { heroRef, isShown };
};
