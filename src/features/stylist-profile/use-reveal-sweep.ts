import { useEffect, useRef } from "react";

/**
 * Scroll reveal for every [data-rv] element: once an element's top is within 92%
 * of the viewport (or it is already above it), it gets revealClass with a 50ms stagger, capped at 250ms.
 * Re-sweeps on scroll, resize and after every render.
 */
export const useRevealSweep = (revealClass: string): void => {
  const sweepRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!revealClass) return;

    let frame = 0;

    const sweep = () => {
      if (frame) return;

      frame = requestAnimationFrame(() => {
        frame = 0;
        const viewportHeight = window.innerHeight;
        let index = 0;

        document
          .querySelectorAll<HTMLElement>(`[data-rv]:not(.${revealClass})`)
          .forEach((element) => {
            const { top, bottom } = element.getBoundingClientRect();

            if (top < viewportHeight * 0.92 || bottom < 0) {
              element.style.transitionDelay = `${Math.min(index * 50, 250)}ms`;
              index++;
              element.classList.add(revealClass);
            }
          });
      });
    };

    sweepRef.current = sweep;
    window.addEventListener("scroll", sweep, { passive: true });
    window.addEventListener("resize", sweep, { passive: true });
    sweep();

    return () => {
      sweepRef.current = null;
      window.removeEventListener("scroll", sweep);
      window.removeEventListener("resize", sweep);

      if (frame) cancelAnimationFrame(frame);
    };
  }, [revealClass]);

  // no dependency list on purpose: sweep after every render
  useEffect(() => {
    sweepRef.current?.();
  });
};
