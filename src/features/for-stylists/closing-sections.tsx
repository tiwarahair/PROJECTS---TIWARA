import { Link } from "react-router";
import { CtaArrowIcon } from "../../components/icons/custom-icons";
import { ResponsiveImage } from "../../components/responsive-image";
import { joinClassNames } from "../../utils/class-names";
import story from "../../styles/components/story-page/index.module.css";
import styles from "../../styles/features/for-stylists/closing-sections.module.css";

export const StatementSection = () => (
  <section
    id="fs-band"
    data-bg="#FAF6EE"
    data-screen-label="Statement"
    className={styles.statement}
  >
    <div
      id="fs-band-frame"
      className={joinClassNames(story.photoFrame, styles.band)}
    >
      <ResponsiveImage
        data-plx=""
        src="site/for-stylists/locs.jpeg"
        sizes="100vw"
        alt="A stylist's hands twisting silver cuffs into a client's locs"
        className={joinClassNames(story.driftImage, styles.bandImage)}
      />
      <div className={styles.scrim}></div>
      <p className={styles.quote}>
        <span className={story.lineMask}>
          <span data-sline="" className={story.line}>
            Less time in your DMs.
          </span>
        </span>
        <span className={story.lineMask}>
          <span
            data-sline=""
            className={joinClassNames(story.line, story.yellowLine)}
          >
            More time behind the chair.
          </span>
        </span>
      </p>
    </div>
  </section>
);

export const ListBusinessSection = () => (
  <section
    data-bg="#FAF6EE"
    data-screen-label="List your business"
    className={styles.listBusiness}
  >
    <div className={styles.listInner}>
      <h2 data-rv="" className={story.closingHeading}>
        Ready to grow your business?
      </h2>
      <p data-rv="" className={styles.lede}>
        Setting up is easy. Add your services, set your hours, connect payments
        and share your link.
      </p>
      <div data-rv="" className={styles.actions}>
        <Link to="/join" className={story.ctaLarge}>
          List your business
          <CtaArrowIcon size={18} strokeWidth={1.7} />
        </Link>
        <span className={styles.logIn}>
          Already listed?{" "}
          <Link to="/login" className={styles.logInLink}>
            Log in
          </Link>
        </span>
      </div>
    </div>
  </section>
);
