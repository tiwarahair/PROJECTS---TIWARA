import { useEffect } from "react";
import type { RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const RESIZE_THRESHOLD = 40;
const RESIZE_DELAY = 250;

export const useStoryMotion = (
  rootRef: RefObject<HTMLElement | null>,
  build: (root: HTMLElement) => void,
) => {
  useEffect(() => {
    const root = rootRef.current;

    if (!root) return;

    let context = gsap.context(() => build(root), root);
    let builtWidth = window.innerWidth;
    let resizeTimer = 0;
    const refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());

    const handleResize = () => {
      window.clearTimeout(resizeTimer);

      resizeTimer = window.setTimeout(() => {
        if (Math.abs(window.innerWidth - builtWidth) <= RESIZE_THRESHOLD)
          return;

        builtWidth = window.innerWidth;
        context.revert();
        context = gsap.context(() => build(root), root);
        ScrollTrigger.refresh();
      }, RESIZE_DELAY);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(refreshFrame);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
      context.revert();
    };
  }, [rootRef, build]);
};
