import { Globe, Mail } from "lucide-react";
import { SOCIAL_ICONS, SocialIcon } from "../../components/icons/brand-icons";
import { Link } from "react-router";
import { joinClassNames } from "../../utils/class-names";
import type { ProfileFacts } from "./profile-facts";
import type { HoursRow } from "./profile-hours";
import styles from "../../styles/features/stylist-profile/booking-aside.module.css";
import pageGlobal from "../../styles/features/stylist-profile/index-global.module.css";

interface BookingAsideProps {
  fromLabel: string;
  bookHref: string;
  facts: ProfileFacts;
  hoursRows: HoursRow[];
}

/** Sticky booking card: Book now (desktop only), opening hours and the social / contact links. */
export const BookingAside = ({
  fromLabel,
  bookHref,
  facts: {
    cancelHours,
    mailto,
    site,
    siteHref,
    instagramHref,
    tiktokHref,
    youtubeHref,
  },
  hoursRows,
}: BookingAsideProps) => (
  <div className={joinClassNames(pageGlobal.bookaside, styles.aside)}>
    <div className={styles.card}>
      <div className={pageGlobal.askcta}>
        <div className={styles.title}>Book an appointment</div>
        <div className={styles.from}>{`from ${fromLabel}`}</div>
        {bookHref ? (
          <>
            <Link to={bookHref} className={styles.bookNow}>
              Book now
            </Link>
            <div className={styles.note}>
              {"No account needed. Free cancellation up to "}
              {cancelHours}h before.
            </div>
          </>
        ) : (
          <div className={styles.note}>Not taking bookings right now.</div>
        )}
      </div>
      <div className={joinClassNames(pageGlobal.askhours, styles.hours)}>
        <div className={styles.hoursTitle}>Opening hours</div>
        {hoursRows.map(({ day, time, shut }) => (
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
          {instagramHref && (
            <a
              href={instagramHref}
              target="_blank"
              rel="noopener"
              aria-label="Instagram"
              className={styles.linkIcon}
            >
              <SocialIcon icon={SOCIAL_ICONS.instagram} size={15} />
            </a>
          )}
          {tiktokHref && (
            <a
              href={tiktokHref}
              target="_blank"
              rel="noopener"
              aria-label="TikTok"
              className={styles.linkIcon}
            >
              <SocialIcon icon={SOCIAL_ICONS.tiktok} size={15} />
            </a>
          )}
          {youtubeHref && (
            <a
              href={youtubeHref}
              target="_blank"
              rel="noopener"
              aria-label="YouTube"
              className={styles.linkIcon}
            >
              <SocialIcon icon={SOCIAL_ICONS.youtube} size={15} />
            </a>
          )}
          {mailto && (
            <a href={mailto} aria-label="Email" className={styles.linkIcon}>
              <Mail size={15} strokeWidth={2.25} />
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
              <Globe size={15} strokeWidth={2.25} />
            </a>
          )}
        </div>
      </div>
    </div>
  </div>
);
