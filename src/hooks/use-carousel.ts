import { useEffect, useState } from "react";

// interval ms
const ROTATE_MS = 5000;

/**
 * Auto-advancing index for the testimonial slider.
 *
 * The interval depends only on `count` and `ROTATE_M` — never on `index` —
 * so it keeps a steady cadence and a manual `goTo` does not restart it. That
 * matches the original `setInterval`, which was created once and never reset:
 * clicking a dot at t=4.9s still advanced 100ms later.
 */
export function useCarousel(count: number): {
  index: number;
  goTo: (next: number) => void;
} {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, ROTATE_MS);

    return () => clearInterval(timer);
  }, [count]);

  return { index, goTo: setIndex };
}
