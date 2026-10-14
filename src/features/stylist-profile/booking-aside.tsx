import { Link } from "react-router";
import { joinClassNames } from "../../utils/class-names";
import { HOURS_ROWS } from "./profile-logic";
import type { ProfileFacts } from "./profile-logic";
import styles from "../../styles/features/stylist-profile/booking-aside.module.css";
import pageGlobal from "../../styles/features/stylist-profile/stylist-profile-page-global.module.css";

interface BookingAsideProps {
  fromLabel: string;
  bookHref: string;
  facts: ProfileFacts;
}

/** Sticky booking card: Book now (desktop only), opening hours and the social / contact links. */
export const BookingAside = ({
  fromLabel,
  bookHref,
  facts: { cancelHours, mailto, site, siteHref },
}: BookingAsideProps) => (
  <div className={joinClassNames(pageGlobal.bookaside, styles.aside)}>
    <div className={styles.card}>
      <div className={pageGlobal.askcta}>
        <div className={styles.title}>Book an appointment</div>
        <div className={styles.from}>{`from ${fromLabel}`}</div>
        <Link to={bookHref} className={styles.bookNow}>
          Book now
        </Link>
        <div className={styles.note}>
          {"No account needed. Free cancellation up to "}
          {cancelHours}h before.
        </div>
      </div>
      <div className={joinClassNames(pageGlobal.askhours, styles.hours)}>
        <div className={styles.hoursTitle}>Opening hours</div>
        {HOURS_ROWS.map(({ day, time, shut }) => (
          <div key={day} className={styles.hoursRow}>
            <span className={styles.hoursDay}>
              <span
                className={joinClassNames(
                  styles.hoursDot,
                  shut && styles.hoursDotShut,
                )}
              ></span>
              {day}
            </span>
            <span className={shut ? styles.hoursTimeShut : styles.hoursTime}>
              {time}
            </span>
          </div>
        ))}
      </div>
      <div className={styles.links}>
        <div className={styles.linkRow}>
          <a
            href="https://www.instagram.com/tiwarashouse/"
            target="_blank"
            rel="noopener"
            aria-label="Instagram"
            className={styles.linkIcon}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="5"></rect>
              <circle cx="12" cy="12" r="4"></circle>
              <circle cx="17.2" cy="6.8" r="1"></circle>
            </svg>
          </a>
          <a
            href="https://www.tiktok.com/@tiwarashouse"
            target="_blank"
            rel="noopener"
            aria-label="TikTok"
            className={styles.linkIcon}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="5"></rect>
              <path d="M13.4 7.4v6.1a2.3 2.3 0 1 1-2.3-2.3"></path>
              <path d="M13.4 7.4c.3 1.3 1.3 2.2 2.6 2.3"></path>
            </svg>
          </a>
          {mailto && (
            <a href={mailto} aria-label="Email" className={styles.linkIcon}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="2" y="4" width="20" height="16" rx="3"></rect>
                <path d="m3 6 9 7 9-7"></path>
              </svg>
            </a>
          )}
          {site && (
            <a
              href={siteHref}
              target="_blank"
              rel="noopener"
              aria-label="Website"
              className={styles.linkIcon}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9"></circle>
                <path d="M3.2 9h17.6M3.2 15h17.6"></path>
                <path d="M12 3c2.4 2.4 3.6 5.4 3.6 9s-1.2 6.6-3.6 9c-2.4-2.4-3.6-5.4-3.6-9S9.6 5.4 12 3z"></path>
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  </div>
);
