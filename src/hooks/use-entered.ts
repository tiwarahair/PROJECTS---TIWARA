import { useEffect, useState } from "react";

/**
 * Flips to true two animation frames after mount, so a CSS transition runs from the element's
 * initial (hidden) styles — the prototype's requestAnimationFrame(() => requestAnimationFrame(...)).
 */
export const useEntered = (): boolean => {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    let innerFrame = 0;

    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => setEntered(true));
    });

    return () => {
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
    };
  }, []);

  return entered;
};
