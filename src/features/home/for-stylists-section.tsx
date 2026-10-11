import { Link } from "react-router";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { ArrowIcon } from "./arrow-icon";
import page from "./home-page.module.css";
import styles from "./for-stylists-section.module.css";

/** Remembers the list-your-business intent for Onboarding (renderVals goList). */
const rememberListFlow = () => {
  try {
    sessionStorage.setItem("tw_flow", "list");
  } catch {
    // storage unavailable
  }
};

export interface ForStylistsSectionProps {
  /** photo = full-bleed photo panel (default) · split = text beside a photo */
  variant: "photo" | "split";
}

/** "Run your chair like a business" (prototype Home "For stylists", prop stylistSection). */
export const ForStylistsSection = ({ variant }: ForStylistsSectionProps) => (
  <section
    id="for-stylists"
    data-bg="#FAF6EE"
    data-screen-label="For stylists"
    className={styles.section}
  >
    {variant === "photo" && (
      <div className={styles.photoWrap}>
        <div id="fsframe" className={styles.frame}>
          <img
            data-plx=""
            loading="lazy"
            src={getAssetUrl("img/new/dsc03215.jpeg")}
            alt="Barber at work"
            className={styles.photo}
          />
          <div className={styles.scrim}></div>
          <div className={joinClassNames(page.fsgrid, styles.grid)}>
            <div className={styles.heading}>
              <div data-rv="" className={styles.eyebrow}>
                For stylists
              </div>
              <h2 data-rv="" className={styles.title}>
                Run your chair like a business
              </h2>
            </div>
            <div data-rv="" className={styles.aside}>
              <p className={styles.lede}>
                Tiwára&apos;s Studio handles bookings, deposits and reminders.
                Free to list, no commission, set up in about five minutes.
              </p>
              <Link
                to="/join"
                onClick={rememberListFlow}
                className={styles.cta}
              >
                List your business
                <ArrowIcon />
              </Link>
            </div>
          </div>
        </div>
      </div>
    )}
    {variant === "split" && (
      <div className={styles.splitWrap}>
        <div className={joinClassNames(page.fsgrid, styles.splitGrid)}>
          <div className={styles.splitText}>
            <div data-rv="" className={styles.splitEyebrow}>
              For stylists
            </div>
            <h2 data-rv="" className={styles.splitTitle}>
              Run your chair like a business
            </h2>
            <p data-rv="" className={styles.splitLede}>
              List for free. Get booked faster. Keep every penny of your price.
              Tiwára&apos;s House handles bookings, deposits and reminders so
              you can focus on what matters.
            </p>
            <div data-rv="" className={styles.splitActions}>
              <Link
                to="/join"
                onClick={rememberListFlow}
                className={styles.splitCta}
              >
                List your business
              </Link>
              <a role="button" className={styles.splitAbout}>
                About us
              </a>
            </div>
          </div>
          <div data-rv="" className={styles.splitPhotoFrame}>
            <img
              loading="lazy"
              src={getAssetUrl("img/w161154.jpg")}
              alt="Stylist at work in the chair"
              className={styles.splitPhoto}
            />
          </div>
        </div>
      </div>
    )}
  </section>
);
