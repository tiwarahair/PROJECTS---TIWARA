import { ChevronRight, TriangleAlert } from "lucide-react";
import { ResponsiveImage } from "../../../components/responsive-image";
import type { AdminProfile } from "../../../lib/admin-api";
import { toPhotoUrl } from "../../../lib/public-stylist";
import { joinClassNames } from "../../../utils/class-names";
import {
  FLAG_LABELS,
  formatDay,
  getCheckLabel,
  getChecksLine,
  getCount,
  getLiveAgo,
  getPriceRange,
} from "./view";
import styles from "../../../styles/features/admin/profiles.module.css";

interface ProfileRowProps {
  profile: AdminProfile;
  isCard: boolean;
  onOpen: () => void;
}

export const ProfileRow = ({ profile, isCard, onOpen }: ProfileRowProps) => {
  const {
    business_name: business,
    owner_name: owner,
    area_label: area,
    cover_path: cover,
    flags,
    went_live_at: liveAt,
    booking_count: bookings,
    cancelled_count: cancelled,
    review_count: reviews,
    reported_count: reported,
    service_count: services,
  } = profile;

  return (
    <button
      type="button"
      className={joinClassNames(styles.row, isCard && styles.rowCard)}
      onClick={onOpen}
    >
      <span className={styles.who}>
        <span className={styles.thumb}>
          {!!cover && (
            <ResponsiveImage
              className={styles.thumbImage}
              src={toPhotoUrl(cover)}
              sizes="64px"
              alt=""
            />
          )}
        </span>
        <span className={styles.stack}>
          <span className={styles.business}>{business}</span>
          <span className={styles.owner}>
            {[owner, area?.split(",")[0]].filter(Boolean).join(" · ")}
          </span>
          <span className={styles.faint}>
            {`${getCount(services, "service")}, ${getPriceRange(profile)}`}
          </span>
        </span>
      </span>
      <span className={styles.stack}>
        <span className={styles.checks}>
          <span className={styles.bars} aria-hidden="true">
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className={joinClassNames(
                  styles.bar,
                  index >= 4 - flags.length && styles.barFail,
                )}
              />
            ))}
          </span>
          {getChecksLine(profile)}
        </span>
        {flags.slice(0, 2).map((flag) => (
          <span key={flag} className={styles.flagLine}>
            <TriangleAlert size={14} strokeWidth={2} />
            {FLAG_LABELS[flag]}
          </span>
        ))}
      </span>
      <span className={styles.stack}>
        <span>{getCount(bookings, "booking")}</span>
        <span className={styles.muted}>
          {`${cancelled} cancelled · ${getCount(reviews, "review")}${reported ? ` · ${reported} reported` : ""}`}
        </span>
      </span>
      <span className={styles.stack}>
        <span>{liveAt ? formatDay(liveAt) : "—"}</span>
        <span className={styles.muted}>{getLiveAgo(profile)}</span>
      </span>
      <span className={styles.state}>
        {getCheckLabel(profile)}
        <ChevronRight size={16} strokeWidth={2} className={styles.chevron} />
      </span>
    </button>
  );
};
