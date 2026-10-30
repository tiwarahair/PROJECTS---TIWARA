import {
  HeroImage,
  HeroTitle,
  preloadHeroImage,
} from "../../components/story-page/hero";
import { joinClassNames } from "../../utils/class-names";
import story from "../../styles/components/story-page/index.module.css";
import styles from "../../styles/features/about/hero-section.module.css";

const HERO_IMAGE = "site/about/living-room.jpeg";

const TITLE_LINES = ["Your next", "hair appointment", "simplified."];

export const preloadAboutHero = () => preloadHeroImage(HERO_IMAGE);

export const HeroSection = () => (
  <section
    id="a-hero"
    data-bg="#1a1714"
    data-screen-label="Hero"
    className={styles.hero}
  >
    <div
      id="a-hero-frame"
      className={joinClassNames(story.photoFrame, styles.frame)}
    >
      <HeroImage
        id="a-hero-img"
        src={HERO_IMAGE}
        alt="The Tiwára's House living room: braiding posters, a leather sofa and plants"
        className={styles.image}
      />
      <div className={styles.scrim}></div>
      <div id="a-hero-copy" className={styles.copy}>
        <div>
          <div data-hero-el="" className={styles.eyebrow}>
            About us
          </div>
          <HeroTitle lines={TITLE_LINES} className={styles.title} />
        </div>
        <p data-hero-el="" className={styles.lede}>
          Tiwára&apos;s House connects you with afro hair specialists across the
          UK. Find, book and pay in one place.
        </p>
      </div>
    </div>
  </section>
);
