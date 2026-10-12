import { useEffect } from "react";
import type { RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const clearInlineMotion = (elements: Iterable<HTMLElement>) => {
  for (const element of elements) {
    element.style.opacity = "";
    element.style.transform = "";
  }
};

/** The highest element on screen — CSS order can move a later element to the top on mobile. */
const getTopmost = (elements: HTMLElement[]): HTMLElement => {
  let topmost = elements[0] as HTMLElement;

  for (const element of elements)
    if (
      element.getBoundingClientRect().top < topmost.getBoundingClientRect().top
    )
      topmost = element;

  return topmost;
};

/**
 * Home's GSAP layer (prototype initGsap, setupParallax, setupWordReveal, setupHeroCrop): hero intro, per-section
 * [data-rv] reveals, [data-plx] image drift and the scrubbed word reveal, with the prototype's safety nets.
 * Always full motion: the reduced-motion toggle was removed.
 */
export const useHomeMotion = (
  rootRef: RefObject<HTMLElement | null>,
  showWhy: boolean,
) => {
  useEffect(() => {
    const root = rootRef.current;

    if (!root) return;

    const timers: number[] = [];

    const later = (callback: () => void, delay: number) =>
      timers.push(window.setTimeout(callback, delay));

    const select = <T extends Element = HTMLElement>(selector: string) => [
      ...root.querySelectorAll<T & Element>(selector),
    ];

    let reveals: ScrollTrigger[] = [];
    let parallax: ScrollTrigger[] = [];
    let wordReveal: ScrollTrigger[] = [];
    let heroIntroDone = false;

    const setupParallax = () => {
      parallax.forEach((trigger) => trigger.kill());
      parallax = [];
      const images = select("[data-plx]");

      if (!images.length) return;

      // images drift against the scroll inside their own frame — the frame clips, so nothing gaps
      images.forEach((image) => {
        const frame = image.parentElement;

        const tween = gsap.fromTo(
          image,
          { yPercent: -4 },
          {
            yPercent: 4,
            ease: "none",
            scrollTrigger: {
              trigger: frame,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.6,
              invalidateOnRefresh: true,
            },
          },
        );

        if (tween.scrollTrigger) parallax.push(tween.scrollTrigger);
      });
    };

    const setupWordReveal = () => {
      if (!showWhy) return;

      const words = select("#wrwords>span");
      const bar = root.querySelector<HTMLElement>("#wrbar");

      const showAll = () => {
        words.forEach((word) => (word.style.opacity = "1"));

        if (bar) bar.style.transform = "scaleY(1)";
      };

      if (!words.length) return;

      if (
        ScrollTrigger.getAll().some(
          ({ trigger }) =>
            (trigger as HTMLElement | undefined)?.id === "wordreveal",
        )
      )
        return;

      // own array — must not be killed by the page's reveal rebuild
      wordReveal.forEach((trigger) => trigger.kill());
      wordReveal = [];

      const scrollTrigger = {
        trigger: "#wordreveal",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.4,
      };

      try {
        gsap.set(words, { opacity: 0.15 });
        gsap.set("#wrbar", { scaleY: 0 });

        const wordsTween = gsap.to(words, {
          opacity: 1,
          ease: "none",
          stagger: { each: 0.5 },
          scrollTrigger,
        });

        const barTween = gsap.to("#wrbar", {
          scaleY: 1,
          ease: "none",
          scrollTrigger,
        });

        [wordsTween, barTween].forEach(
          ({ scrollTrigger: trigger }) => trigger && wordReveal.push(trigger),
        );

        ScrollTrigger.refresh();
      } catch {
        showAll();

        return;
      }

      // safety net: never leave the copy at 15%
      later(() => {
        const isLive = () =>
          ScrollTrigger.getAll().some(
            ({ trigger }) =>
              (trigger as HTMLElement | undefined)?.id === "wordreveal",
          );

        if (!isLive()) setupWordReveal();

        later(() => {
          if (!isLive()) showAll();
        }, 1200);
      }, 1600);
    };

    const initialise = () => {
      reveals.forEach((trigger) => trigger.kill());
      reveals = [];

      if (!heroIntroDone) {
        heroIntroDone = true;

        gsap.fromTo(
          "#heroframe > img",
          { scale: 1.12 },
          { scale: 1, duration: 2.3, ease: "power2.out" },
        );

        gsap.fromTo(
          select("[data-hero-el]"),
          { y: 44, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1.05,
            stagger: 0.11,
            ease: "power3.out",
            delay: 0.2,
            clearProps: "opacity,transform",
            overwrite: "auto",
          },
        );

        later(() => clearInlineMotion(select("[data-hero-el]")), 2600);
      }

      // stagger reveal: per section, the heading rises out of a mask, followers stagger in behind it
      const groups = new Map<Element, HTMLElement[]>();

      select("[data-rv]").forEach((element) => {
        const section = element.closest("section") || element.parentElement;

        if (!section || section.id === "hero" || element.id === "chatphone")
          return;

        groups.set(section, [...(groups.get(section) ?? []), element]);
      });

      groups.forEach((elements) => {
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: getTopmost(elements),
            start: window.innerWidth <= 760 ? "top 99%" : "top 92%",
            toggleActions: "play none none none",
          },
        });

        const heading = elements.find(({ tagName }) =>
          /^H[1-6]$/.test(tagName),
        );

        const rest = elements.filter((element) => element !== heading);

        if (heading)
          timeline.fromTo(
            heading,
            { opacity: 0, clipPath: "inset(0% 0% 100% 0%)" },
            {
              opacity: 1,
              clipPath: "inset(0% 0% -12% 0%)",
              duration: 1,
              ease: "power3.out",
              clearProps: "opacity,clipPath",
            },
            0,
          );

        if (rest.length)
          timeline.fromTo(
            rest,
            { y: 26, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.7,
              stagger: 0.08,
              ease: "power2.out",
              clearProps: "opacity,transform",
            },
            heading ? 0.16 : 0,
          );

        if (timeline.scrollTrigger) reveals.push(timeline.scrollTrigger);
      });

      // one debounced refresh after the layout settles
      later(() => ScrollTrigger.refresh(), 600);

      // safety net: if triggers went missing, never leave content invisible
      later(() => {
        if (ScrollTrigger.getAll().length === 0)
          clearInlineMotion(select("[data-rv]"));
      }, 1800);

      // hero stays full bleed; the scroll-crop effect was removed
      const frame = root.querySelector<HTMLElement>("#heroframe");

      frame?.style.setProperty("--hcrop", "0px");
      frame?.style.setProperty("--hrad", "0px");
      setupWordReveal();
      setupParallax();
    };

    const context = gsap.context(() => initialise(), root);

    // triggers can be wiped by a remount — rebuild them if they vanish (word-reveal pair excluded)
    const watch = window.setInterval(() => {
      const own = ScrollTrigger.getAll().filter(
        ({ trigger }) =>
          (trigger as HTMLElement | undefined)?.id !== "wordreveal",
      ).length;

      if (own === 0) context.add(() => initialise());
    }, 1200);

    return () => {
      window.clearInterval(watch);
      timers.forEach((timer) => window.clearTimeout(timer));

      [...reveals, ...parallax, ...wordReveal].forEach((trigger) =>
        trigger.kill(),
      );

      context.revert();
    };
  }, [rootRef, showWhy]);
};
