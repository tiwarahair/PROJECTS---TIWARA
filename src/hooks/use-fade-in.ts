import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

const THRESHOLD = 0.12;

/**
 *
 * A scroll-triggered fade-in-once hook used through-out the app. Returns a ref and a boolean flag that flips to true,
 * attach the ref to the element and add conditionally add `visible` to its class.
 */
export function useFadeIn<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // once the element is 12% visable, set setVisible to true & stop observing it
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold: THRESHOLD },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, visible];
}
