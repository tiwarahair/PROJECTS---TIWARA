import type { MouseEvent } from "react";
import { Link } from "react-router";
import { joinClassNames } from "../../utils/class-names";
import type { LastSearch } from "../../utils/last-search";
import type { ProfileActions } from "./profile-cover";
import { BackPath, HeartPath, SharePaths } from "./profile-icons";
import styles from "../../styles/features/stylist-profile/profile-sticky-bar.module.css";
import helmet from "../../styles/features/stylist-profile/stylist-profile-helmet.module.css";

interface ProfileStickyBarProps {
  name: string;
  back: LastSearch;
  onBack: (event: MouseEvent<HTMLAnchorElement>) => void;
  actions: ProfileActions;
}

/** Mobile bar that drops in once the cover has scrolled away. */
export const ProfileStickyBar = ({
  name,
  back,
  onBack,
  actions: {
    shareLabel,
    shareExpanded,
    onShare,
    saved,
    saveLabel,
    saveTip,
    onToggleSaved,
  },
}: ProfileStickyBarProps) => (
  <div
    data-screen-label="Profile sticky bar"
    className={joinClassNames(helmet.pfSticky, helmet.pfMobonly, styles.bar)}
  >
    {back.has && (
      <Link
        to={back.href}
        onClick={onBack}
        aria-label={back.label}
        className={styles.back}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <BackPath />
        </svg>
      </Link>
    )}
    <span className={styles.name}>{name}</span>
    <button
      data-tip="Share"
      onClick={onShare}
      aria-label={shareLabel}
      aria-haspopup="dialog"
      aria-expanded={shareExpanded}
      className={styles.iconButton}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <SharePaths />
      </svg>
    </button>
    <button
      data-tip={saveTip}
      onClick={onToggleSaved}
      aria-label={saveLabel}
      aria-pressed={saved ? "true" : "false"}
      className={styles.iconButton}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={saved ? "var(--accent-700)" : "none"}
        stroke={saved ? "var(--accent-700)" : "currentColor"}
        strokeWidth="1.7"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <HeartPath />
      </svg>
    </button>
  </div>
);
