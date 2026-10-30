import { gsap } from "gsap";
import {
  animateHero,
  driftImages,
  revealHeroText,
  revealOnScroll,
  revealStatementLines,
  selectOne,
} from "../../utils/story-motion";

export const buildForStylistsMotion = (root: HTMLElement) => {
  const hero = selectOne(root, "#fs-hero");
  const image = selectOne(root, "#fs-hero-img");
  const copy = selectOne(root, "#fs-hero-copy");
  const inset = selectOne(root, "#fs-inset");
  const band = selectOne(root, "#fs-band");
  const bandFrame = selectOne(root, "#fs-band-frame");

  if (!hero || !image || !copy || !inset || !band || !bandFrame) return;

  revealHeroText(root);
  animateHero({ hero, image, copy, copyShift: -70, copyOpacity: 0.2 });

  gsap.to(inset, {
    scale: 0.94,
    borderRadius: "48px",
    ease: "none",
    scrollTrigger: {
      trigger: hero,
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });

  gsap.fromTo(
    bandFrame,
    { scale: 0.9 },
    {
      scale: 1,
      ease: "none",
      scrollTrigger: {
        trigger: band,
        start: "top bottom",
        end: "top 20%",
        scrub: 0.5,
      },
    },
  );

  revealStatementLines(bandFrame);
  revealOnScroll(root);
  driftImages(root);
};
