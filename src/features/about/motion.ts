import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  animateHero,
  driftImages,
  floatOnScroll,
  revealHeroText,
  revealOnScroll,
  revealStatementLines,
  selectAll,
  selectOne,
} from "../../utils/story-motion";

const FLOAT_FROM_WIDTH = 861;

const animateMilestones = (root: HTMLElement) => {
  const accent = getComputedStyle(root).getPropertyValue("--accent-700");

  selectAll(root, "[data-ms]").forEach((milestone) => {
    const dot = selectOne(milestone, "[data-dot]");
    const year = selectOne(milestone, "[data-year]");

    if (!dot || !year) return;

    const { backgroundColor: dotColour } = getComputedStyle(dot);
    const { color: yearColour } = getComputedStyle(year);

    gsap.from(milestone, {
      opacity: 0,
      y: 36,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: { trigger: milestone, start: "top 85%", once: true },
    });

    ScrollTrigger.create({
      trigger: milestone,
      start: "top 60%",
      onEnter: () => {
        gsap.to(dot, { backgroundColor: accent, scale: 1.25, duration: 0.3 });
        gsap.to(year, { color: accent, duration: 0.3 });
      },
      onLeaveBack: () => {
        gsap.to(dot, { backgroundColor: dotColour, scale: 1, duration: 0.3 });
        gsap.to(year, { color: yearColour, duration: 0.3 });
      },
    });
  });
};

export const buildAboutMotion = (root: HTMLElement) => {
  const hero = selectOne(root, "#a-hero");
  const image = selectOne(root, "#a-hero-img");
  const copy = selectOne(root, "#a-hero-copy");
  const words = selectOne(root, "#a-words");
  const storyList = selectOne(root, "#a-story-list");
  const storyLine = selectOne(root, "#a-line");
  const statement = selectOne(root, "#a-statement");
  const statementFrame = selectOne(root, "#a-stmt-frame");

  if (
    !hero ||
    !image ||
    !copy ||
    !words ||
    !storyList ||
    !storyLine ||
    !statement ||
    !statementFrame
  )
    return;

  revealHeroText(root);
  animateHero({ hero, image, copy, copyShift: -80, copyOpacity: 0.15 });

  gsap.fromTo(
    selectAll(words, "[data-word]"),
    { opacity: 0.14 },
    {
      opacity: 1,
      ease: "none",
      stagger: 0.5,
      scrollTrigger: {
        trigger: words,
        start: "top 78%",
        end: "bottom 42%",
        scrub: 0.4,
      },
    },
  );

  gsap.fromTo(
    storyLine,
    { scaleY: 0 },
    {
      scaleY: 1,
      ease: "none",
      scrollTrigger: {
        trigger: storyList,
        start: "top 60%",
        end: "bottom 60%",
        scrub: 0.4,
      },
    },
  );

  animateMilestones(root);

  gsap.fromTo(
    statementFrame,
    { clipPath: "inset(6% 5% 6% 5% round 40px)" },
    {
      clipPath: "inset(0% 0% 0% 0% round 0px)",
      ease: "none",
      scrollTrigger: {
        trigger: statement,
        start: "top 90%",
        end: "top 10%",
        scrub: 0.5,
      },
    },
  );

  revealStatementLines(statementFrame);
  revealOnScroll(root);
  driftImages(root);

  if (window.innerWidth >= FLOAT_FROM_WIDTH)
    floatOnScroll(selectAll(root, "[data-speed]"), 60);
};
