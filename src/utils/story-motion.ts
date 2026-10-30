import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getImageFrame } from "./image-frame";

gsap.registerPlugin(ScrollTrigger);

interface HeroMotion {
  hero: HTMLElement;
  image: HTMLElement;
  copy: HTMLElement;
  copyShift: number;
  copyOpacity: number;
}

export const selectAll = (root: HTMLElement, selector: string) => [
  ...root.querySelectorAll<HTMLElement>(selector),
];

export const selectOne = (root: HTMLElement, selector: string) =>
  root.querySelector<HTMLElement>(selector);

export const revealHeroText = (root: HTMLElement) => {
  gsap.fromTo(
    selectAll(root, "[data-line]"),
    { yPercent: 110 },
    {
      yPercent: 0,
      duration: 1.2,
      stagger: 0.1,
      ease: "power4.out",
      delay: 0.15,
    },
  );

  gsap.fromTo(
    selectAll(root, "[data-hero-el]"),
    { y: 24, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 1,
      stagger: 0.12,
      ease: "power3.out",
      delay: 0.5,
    },
  );
};

export const animateHero = ({
  hero,
  image,
  copy,
  copyShift,
  copyOpacity,
}: HeroMotion) => {
  gsap.fromTo(
    image,
    { scale: 1.14 },
    { scale: 1, duration: 2.2, ease: "power2.out" },
  );

  gsap.to(image, {
    yPercent: 12,
    ease: "none",
    scrollTrigger: {
      trigger: hero,
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });

  gsap.to(copy, {
    y: copyShift,
    opacity: copyOpacity,
    ease: "none",
    scrollTrigger: {
      trigger: hero,
      start: "top top",
      end: "bottom 20%",
      scrub: true,
    },
  });
};

export const revealStatementLines = (frame: HTMLElement) =>
  gsap.fromTo(
    selectAll(frame, "[data-sline]"),
    { yPercent: 110 },
    {
      yPercent: 0,
      duration: 1.1,
      stagger: 0.12,
      ease: "power4.out",
      scrollTrigger: { trigger: frame, start: "top 45%", once: true },
    },
  );

export const revealOnScroll = (root: HTMLElement) =>
  selectAll(root, "[data-rv]").forEach((element) =>
    gsap.from(element, {
      y: 40,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: { trigger: element, start: "top 88%", once: true },
    }),
  );

export const driftImages = (root: HTMLElement) =>
  selectAll(root, "[data-plx]").forEach((image) =>
    gsap.fromTo(
      image,
      { yPercent: -6 },
      {
        yPercent: 6,
        ease: "none",
        scrollTrigger: {
          trigger: getImageFrame(image),
          start: "top bottom",
          end: "bottom top",
          scrub: 0.6,
        },
      },
    ),
  );

export const floatOnScroll = (elements: HTMLElement[], distance: number) =>
  elements.forEach((element) => {
    const speed = parseFloat(element.dataset.speed ?? "") || 1;

    gsap.fromTo(
      element,
      { y: distance * speed },
      {
        y: -distance * speed,
        ease: "none",
        scrollTrigger: {
          trigger: element,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.8,
        },
      },
    );
  });
