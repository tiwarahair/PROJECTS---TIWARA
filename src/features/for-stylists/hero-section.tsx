import { Link } from "react-router";
import {
  HeroImage,
  HeroTitle,
  preloadHeroImage,
} from "../../components/story-page/hero";
import styles from "../../styles/features/for-stylists/hero-section.module.css";

const HERO_IMAGE = "site/for-stylists/hero.jpeg";

const TITLE_LINES = [
  "More than bookings.",
  "A better way to run",
  "your hair business.",
];

export const preloadForStylistsHero = () => preloadHeroImage(HERO_IMAGE);

export const HeroSection = () => (
  <section
    id="fs-hero"
    data-bg="#1a1714"
    data-screen-label="Hero"
    className={styles.hero}
  >
    <div id="fs-inset" className={styles.inset}>
      <HeroImage
        id="fs-hero-img"
        src={HERO_IMAGE}
        alt="Four women in a warmly lit salon, two reading hair magazines while two style their hair"
        className={styles.image}
      />
      <div className={styles.scrim}></div>
      <div id="fs-hero-copy" className={styles.copy}>
        <HeroTitle lines={TITLE_LINES} className={styles.title} />
        <div data-hero-el="" className={styles.actions}>
          <Link to="/join" className={styles.primaryPill}>
            List your business
          </Link>
          <a href="#benefits" className={styles.outlinePill}>
            See the benefits
          </a>
        </div>
      </div>
    </div>
  </section>
);
