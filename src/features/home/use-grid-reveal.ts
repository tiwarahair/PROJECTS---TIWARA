import { useEffect } from "react";
import type { RefObject } from "react";

/** Hides the elements, then rises them in one after another once the first scrolls into view. */
const reveal = (elements: HTMLElement[], step: number) => {
  elements.forEach((element) => {
    element.style.opacity = "0";
    element.style.transform = "translateY(26px)";
  });

  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach(({ isIntersecting }) => {
        if (!isIntersecting) return;

        observer.disconnect();

        elements.forEach((element, index) => {
          const delay = (index * step).toFixed(2);

          element.style.transition = `opacity .7s cubic-bezier(.2,.8,.2,1) ${delay}s, transform .7s cubic-bezier(.2,.8,.2,1) ${delay}s`;
          element.style.transform = "translateY(0)";
          element.style.opacity = "1";
        });
      }),
    {
      threshold: 0,
      rootMargin:
        window.innerWidth <= 760 ? "0px 0px -4% 0px" : "0px 0px -10% 0px",
    },
  );

  elements.forEach((element) => observer.observe(element));

  return observer;
};

/**
 * Browse by style: heading first, then the tiles a row at a time. The tiles load after the heading,
 * so they set up again whenever tileCount changes.
 * Always full motion: the reduced-motion toggle was removed.
 */
export const useGridReveal = (
  sectionRef: RefObject<HTMLElement | null>,
  tileClass: string,
  gridClass: string,
  tileCount: number,
) => {
  useEffect(() => {
    const heads = [
      ...(sectionRef.current?.querySelectorAll<HTMLElement>("[data-sr]") ?? []),
    ];

    if (!heads.length) return;

    const observer = reveal(heads, 0.08);

    return () => observer.disconnect();
  }, [sectionRef]);

  useEffect(() => {
    const root = sectionRef.current;

    if (!root || !tileCount) return;

    const tiles = [...root.querySelectorAll<HTMLElement>(`.${tileClass}`)];
    const grid = root.querySelector(`.${gridClass}`);

    const columns = grid
      ? getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean)
          .length
      : 3;

    const rows: HTMLElement[][] = [];

    tiles.forEach((tile, index) => {
      const row = Math.floor(index / columns);

      (rows[row] = rows[row] || []).push(tile);
    });

    const observers = rows.map((row) => reveal(row, 0.12));

    return () => observers.forEach((observer) => observer.disconnect());
  }, [sectionRef, tileClass, gridClass, tileCount]);
};
