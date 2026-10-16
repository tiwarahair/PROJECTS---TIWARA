import type { MouseEvent } from "react";
import { ArrowLeft, Heart, Share } from "lucide-react";
import { Link } from "react-router";
import { joinClassNames } from "../../utils/class-names";
import type { LastSearch } from "../../utils/last-search";
import type { ProfileActions } from "./profile-cover";
import styles from "../../styles/features/stylist-profile/profile-sticky-bar.module.css";
import pageGlobal from "../../styles/features/stylist-profile/stylist-profile-page-global.module.css";

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
    className={joinClassNames(
      pageGlobal.pfSticky,
      pageGlobal.pfMobonly,
      styles.bar,
    )}
  >
    {back.has && (
      <Link
        to={back.href}
        onClick={onBack}
        aria-label={back.label}
        className={styles.back}
      >
        <ArrowLeft size={20} strokeWidth={2} />
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
      <Share size={18} strokeWidth={1.7} />
    </button>
    <button
      data-tip={saveTip}
      onClick={onToggleSaved}
      aria-label={saveLabel}
      aria-pressed={saved ? "true" : "false"}
      className={styles.iconButton}
    >
      <Heart
        size={18}
        strokeWidth={1.7}
        fill={saved ? "var(--accent-700)" : "none"}
        color={saved ? "var(--accent-700)" : "currentColor"}
      />
    </button>
  </div>
);
