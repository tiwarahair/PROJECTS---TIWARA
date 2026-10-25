import { MapPin, Star, Truck } from "lucide-react";
import { VerifiedBadgeIcon } from "../../components/icons/custom-icons";
import type { Stylist } from "../../types/stylist";
import { joinClassNames } from "../../utils/class-names";
import type { ProfileFacts } from "./profile-facts";
import type { OpenStatus } from "./profile-hours";
import styles from "../../styles/features/stylist-profile/profile-lede.module.css";
import pageGlobal from "../../styles/features/stylist-profile/index-global.module.css";

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
      <div className={joinClassNames(pageGlobal.scpLede, styles.lede)}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>
            <span className={styles.name}>
              {name}{" "}
              {verified && (
                <VerifiedBadgeIcon size={24} className={styles.verified} />
              )}
            </span>
            <span className={styles.rating}>
              <Star size={16} strokeWidth={0} fill="var(--brand-yellow)" />
              {reviews ? (
                <>
                  {rating.toFixed(1)}{" "}
                  <span className={styles.reviewCount}>({reviews})</span>
                </>
              ) : (
                "New"
              )}
            </span>
          </h1>
        </div>
        <div className={styles.meta}>
          <span className={styles.area}>
            <MapPin size={14} strokeWidth={1.8} />
            {area}
          </span>
          {mobile && (
            <span className={styles.travels}>
              <Truck size={13} strokeWidth={1.7} />
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
