import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

/** The prototype ships the stylist row static (STY_STATIC = true); flip to false to bring the ring carousel back. */
export const STY_STATIC = true;

export interface RingCard {
  order: number;
  scale: string;
  opacity: string;
  dim: "0" | "1";
}

/**
 * Stylist ring carousel (prototype Home setupStyCarousel + renderVals styCards): the highlighted card moves every
 * 6s, pauses on hover/touch (releasing itself after 4s) and while the section is off screen, and stays centred.
 * Inactive while STY_STATIC is true — every card then keeps its index at full scale and opacity.
 */
export const useStylistCarousel = (
  rowRef: RefObject<HTMLElement | null>,
  count: number,
) => {
  const [highlighted, setHighlighted] = useState(0);
  const pauseRef = useRef(false);

  useEffect(() => {
    if (STY_STATIC || !count) return;
    const row = rowRef.current;
    if (!row) return;
    let isHeld = false;
    let pauseTimer = 0;
    const centre = () => {
      const cards = [...row.children] as HTMLElement[];
      const middle = Math.floor(cards.length / 2);
      const card = cards.find(
        (child) => getComputedStyle(child).order === String(middle),
      );
      if (!card) return;
      const target = Math.max(
        0,
        Math.min(
          row.scrollWidth - row.clientWidth,
          card.offsetLeft + card.offsetWidth / 2 - row.clientWidth / 2,
        ),
      );
      if (Math.abs(row.scrollLeft - target) > 2) row.scrollLeft = target;
    };
    const advance = window.setInterval(() => {
      if (!isHeld) setHighlighted((current) => (current + 1) % count);
    }, 6000);
    const visibility = window.setInterval(() => {
      const section = document.getElementById("stylists");
      const bounds = section?.getBoundingClientRect();
      const isVisible = bounds
        ? bounds.bottom > 0 && bounds.top < window.innerHeight
        : true;
      isHeld = pauseRef.current || !isVisible;
      centre();
    }, 400);
    // hover/touch pauses, and releases itself after a few seconds — a pointerleave never arrives on touch
    const hold = (isOn: boolean) => () => {
      pauseRef.current = isOn;
      window.clearTimeout(pauseTimer);
      if (isOn)
        pauseTimer = window.setTimeout(() => (pauseRef.current = false), 4000);
    };
    const handleOver = hold(true);
    const handleOut = hold(false);
    row.addEventListener("pointerenter", handleOver);
    row.addEventListener("pointerleave", handleOut);
    row.addEventListener("pointerdown", handleOver);
    row.addEventListener("touchstart", handleOver, { passive: true });
    const centreTimers = [
      window.setTimeout(centre, 60),
      window.setTimeout(centre, 400),
    ];
    return () => {
      window.clearInterval(advance);
      window.clearInterval(visibility);
      window.clearTimeout(pauseTimer);
      centreTimers.forEach((timer) => window.clearTimeout(timer));
      row.removeEventListener("pointerenter", handleOver);
      row.removeEventListener("pointerleave", handleOut);
      row.removeEventListener("pointerdown", handleOver);
      row.removeEventListener("touchstart", handleOver);
    };
  }, [rowRef, count]);

  const getRingCard = (index: number): RingCard => {
    if (STY_STATIC) return { order: index, scale: "1", opacity: "1", dim: "0" };
    const middle = Math.floor(count / 2);
    const current = count ? ((highlighted % count) + count) % count : 0;
    const isHighlighted = index === current;
    return {
      order: count ? (((index - current + middle) % count) + count) % count : 0,
      scale: isHighlighted ? "1" : "0.9",
      opacity: isHighlighted ? "1" : "0.42",
      dim: isHighlighted ? "0" : "1",
    };
  };

  /** Clicking a dimmed card brings it to the centre (no-op while static). */
  const promote = (index: number) => {
    if (!STY_STATIC) setHighlighted(index);
  };

  return { getRingCard, promote };
};
