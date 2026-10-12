import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { isDarkBackground } from "./home-colours";

export interface NavMorphState {
  navSolid: boolean;
  navDark: boolean;
  navHidden: boolean;
  navBackground: string;
  morphBackground: string;
}

const INITIAL: NavMorphState = {
  navSolid: false,
  navDark: false,
  navHidden: false,
  navBackground: "#FAF6EE",
  morphBackground: "#FAF6EE",
};

const getIsHidden = (
  scrollY: number,
  previousY: number,
  wasHidden: boolean,
): boolean => {
  if (scrollY > previousY + 2 && scrollY > 4) return true;

  if (scrollY < previousY - 2 || scrollY <= 4) return false;

  return wasHidden;
};

/**
 * Scroll-driven nav and page background (prototype Home _onScroll): the nav hides on the way down and returns
 * on the way up, turns solid past 40px, follows the data-bg of the section under it, and the page background
 * cross-fades to the cream section in the middle of the viewport.
 */
export const useNavMorph = (): NavMorphState => {
  const [state, setState] = useState(INITIAL);
  const stateRef = useRef(state);

  stateRef.current = state;
  const lastYRef = useRef<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const current = stateRef.current;
      const scrollY = window.scrollY;
      const isSolid = scrollY > 40;
      // hide the nav on the way down, bring it back the moment you scroll up
      const previousY = lastYRef.current == null ? 0 : lastYRef.current;
      const isHidden = getIsHidden(scrollY, previousY, current.navHidden);

      lastYRef.current = scrollY;

      const hero = document.querySelector<HTMLElement>(
        '[data-screen-label="Hero"]',
      );

      const isOverHero =
        isSolid && hero ? scrollY < hero.offsetHeight - 72 : false;

      let navBackground = current.navBackground;
      let morphBackground = current.morphBackground;
      const middle = window.innerHeight * 0.55;

      document.querySelectorAll("[data-bg]").forEach((section) => {
        const rect = section.getBoundingClientRect();
        const colour = section.getAttribute("data-bg") ?? "";

        if (!isOverHero && rect.top <= 80 && rect.bottom > 80)
          navBackground = colour;

        // ink bands paint their own fill — keeping them out of the morph layer stops
        // the dark colour bleeding through the transparent cream sections mid-crossfade
        if (
          rect.top <= middle &&
          rect.bottom > middle &&
          !isDarkBackground(colour)
        )
          morphBackground = colour;
      });

      // any ink section under the header gets the cream nav treatment, not just the hero
      const isDark = isOverHero || isDarkBackground(navBackground);

      if (
        isHidden !== current.navHidden ||
        isSolid !== current.navSolid ||
        isDark !== current.navDark ||
        navBackground !== current.navBackground ||
        morphBackground !== current.morphBackground
      )
        setState({
          navHidden: isHidden,
          navSolid: isSolid,
          navDark: isDark,
          navBackground,
          morphBackground,
        });

      // some hosts swallow the scroll events ScrollTrigger listens for — drive it ourselves
      try {
        ScrollTrigger.update();
      } catch {
        // ScrollTrigger not ready
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return state;
};
