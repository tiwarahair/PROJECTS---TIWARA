import type { Stylist } from "../../types/stylist";
import { joinClassNames } from "../../utils/class-names";
import type { OpenStatus, ProfileFacts } from "./profile-logic";
import styles from "../../styles/features/stylist-profile/profile-lede.module.css";
import helmet from "../../styles/features/stylist-profile/stylist-profile-helmet.module.css";

interface ProfileLedeProps {
  stylist: Stylist;
  facts: ProfileFacts;
  status: OpenStatus;
}

/** Name, rating, area, open status, the booking-policy chips and the bio. */
export const ProfileLede = ({
  stylist: { name, verified, rating, reviews, area, mobile, bio },
  facts: { hasPayChip, depositChip, cancelChip },
  status: { isOpen, openLabel, openHours },
}: ProfileLedeProps) => (
  <>
    <div className={styles.ledeRow}>
      <div className={joinClassNames(helmet.scpLede, styles.lede)}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>
            <span className={styles.name}>
              {name}{" "}
              {verified && (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="var(--accent-700)"
                >
                  <path d="M12 2l2.4 2.1 3.1-.4 1 3 2.9 1.2-.6 3.1L23 12l-2.2 2.3.6 3.1-2.9 1.2-1 3-3.1-.4L12 22l-2.4-2.1-3.1.4-1-3-2.9-1.2.6-3.1L1 12l2.2-2.3-.6-3.1 2.9-1.2 1-3 3.1.4z"></path>
                  <path
                    d="M9.5 12.2l1.8 1.8 3.6-3.8"
                    stroke="#fffefb"
                    strokeWidth="1.8"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></path>
                </svg>
              )}
            </span>
            <span className={styles.rating}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="var(--neutral-900)"
              >
                <path
                  d="M12 2l3 6.6 7 .7-5.3 4.7 1.6 7-6.3-3.8L5.7 21l1.6-7L2 9.3l7-.7z"
                  fill="var(--brand-yellow)"
                ></path>
              </svg>
              {rating} <span className={styles.reviewCount}>({reviews})</span>
            </span>
          </h1>
        </div>
        <div className={styles.meta}>
          <span className={styles.area}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            {area}
          </span>
          {mobile && (
            <span className={styles.travels}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 17V7a2 2 0 0 1 2-2h9v12"></path>
                <path d="M14 9h4l3 4v4h-7"></path>
                <circle cx="7.5" cy="17.5" r="2"></circle>
                <circle cx="17.5" cy="17.5" r="2"></circle>
              </svg>
              Travels to you
            </span>
          )}
          <span className={styles.openStatus}>
            <span
              className={joinClassNames(
                styles.openDot,
                isOpen && styles.openDotOn,
              )}
            ></span>
            <span
              className={joinClassNames(
                styles.openText,
                isOpen && styles.openTextOn,
              )}
            >
              {openLabel}
            </span>
            <span className={styles.openHours}>{openHours}</span>
          </span>
        </div>
        <div className={styles.chips}>
          {hasPayChip && <span className={styles.chip}>{depositChip}</span>}
          <span className={styles.chip}>{cancelChip}</span>
          <span className={styles.chip}>Balance paid in salon</span>
        </div>
      </div>
    </div>
    <p data-rv="" className={styles.bio}>
      {bio}
    </p>
  </>
);
