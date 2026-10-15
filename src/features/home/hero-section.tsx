import { ResponsiveImage } from "../../components/responsive-image/responsive-image";
import { Link } from "react-router";
import { joinClassNames } from "../../utils/class-names";
import { ArrowIcon } from "./arrow-icon";
import page from "../../styles/features/home/home-page.module.css";
import styles from "../../styles/features/home/hero-section.module.css";

/** Full-bleed hero with the flowing "Book now" CTA. */
export const HeroSection = () => (
  <section
    id="hero"
    data-bg="#FAF6EE"
    data-screen-label="Hero"
    className={joinClassNames(page.hero, styles.hero)}
  >
    <div id="heroframe" className={styles.frame}>
      <ResponsiveImage
        src="site/hero.jpg"
        sizes="100vw"
        loading="eager"
        fetchPriority="high"
        alt="Stylist cornrowing a client at Tiwára's House"
        className={styles.image}
      />
      <div className={styles.scrim}></div>
    </div>
    <div className={styles.content}>
      <div data-hero-el="" className={styles.eyebrow}>
        Afro hair booking, done properly
      </div>
      <h1 data-hero-el="" className={styles.title}>
        Your stylist is closer than you{" "}
        <i className={styles.titleEmphasis}>think.</i>
      </h1>
      <p data-hero-el="" className={styles.lede}>
        Discover, book, and pay — all in one place, without the endless
        messaging.
      </p>
      <div data-hero-el="" className={styles.actions}>
        <Link
          to="/search"
          className={joinClassNames(page.flowbtn, styles.bookNow)}
        >
          <ArrowIcon
            className={joinClassNames(page.fbArrow, page.fbArrowLeft)}
          />
          <span className={page.fbCircle}></span>
          <span className={page.fbText}>Book now</span>
          <ArrowIcon
            className={joinClassNames(page.fbArrow, page.fbArrowRight)}
          />
        </Link>
      </div>
    </div>
  </section>
);
