import { useEffect } from "react";
import type { RefObject } from "react";

/**
 * Browse by style: heading first, then the tiles a row at a time (prototype Home gridReveal).
 * Always full motion: the reduced-motion toggle was removed.
 */
export const useGridReveal = (
  sectionRef: RefObject<HTMLElement | null>,
  tileClass: string,
  gridClass: string,
) => {
  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;
    const heads = [...root.querySelectorAll<HTMLElement>("[data-sr]")];
    const tiles = [...root.querySelectorAll<HTMLElement>("." + tileClass)];
    const observers: IntersectionObserver[] = [];
    const show = (elements: HTMLElement[], step: number) => {
      if (!elements.length) return;
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
      observers.push(observer);
    };
    show(heads, 0.08);
    const grid = root.querySelector("." + gridClass);
    const columns = grid
      ? getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean)
          .length
      : 3;
    const rows: HTMLElement[][] = [];
    tiles.forEach((tile, index) => {
      const row = Math.floor(index / columns);
      (rows[row] = rows[row] || []).push(tile);
    });
    rows.forEach((row) => show(row, 0.12));
    return () => observers.forEach((observer) => observer.disconnect());
  }, [sectionRef, tileClass, gridClass]);
};
