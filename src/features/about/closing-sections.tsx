import { Link } from "react-router";
import { CtaArrowIcon } from "../../components/icons/custom-icons";
import { ResponsiveImage } from "../../components/responsive-image";
import { joinClassNames } from "../../utils/class-names";
import story from "../../styles/components/story-page/index.module.css";
import styles from "../../styles/features/about/closing-sections.module.css";

const STATEMENT_LINES = ["The way we book hair", "hasn't changed in years."];

export const StatementSection = () => (
  <section
    id="a-statement"
    data-bg="#1a1714"
    data-screen-label="Statement"
    className={styles.statement}
  >
    <div
      id="a-stmt-frame"
      className={joinClassNames(story.photoFrame, styles.frame)}
    >
      <ResponsiveImage
        data-plx=""
        src="site/about/hair-products.jpeg"
        sizes="100vw"
        alt="Hair magazines, brushes and products laid out on a wooden floor"
        className={joinClassNames(story.driftImage, styles.image)}
      />
      <div className={styles.scrim}></div>
      <div className={styles.copy}>
        <p className={styles.quote}>
          {STATEMENT_LINES.map((line) => (
            <span key={line} className={story.lineMask}>
              <span data-sline="" className={story.line}>
                {line}
              </span>
            </span>
          ))}
          <span className={story.lineMask}>
            <span
              data-sline=""
              className={joinClassNames(story.line, story.yellowLine)}
            >
              We&apos;re changing it.
            </span>
          </span>
        </p>
      </div>
    </div>
  </section>
);

export const FindStylistSection = () => (
  <section
    data-bg="#FAF6EE"
    data-screen-label="Book a stylist"
    className={styles.findStylist}
  >
    <div className={styles.findInner}>
      <div className={styles.findCopy}>
        <h2 data-rv="" className={story.closingHeading}>
          Find your stylist.
        </h2>
        <p data-rv="" className={styles.lede}>
          Browse afro hair specialists near you, see real prices and book in a
          few taps.
        </p>
      </div>
      <Link data-rv="" to="/search" className={story.ctaLarge}>
        Find a stylist
        <CtaArrowIcon size={18} strokeWidth={1.7} />
      </Link>
    </div>
  </section>
);
