import type { MouseEvent, RefObject } from "react";
import { ArrowLeft, Heart, Share } from "lucide-react";
import { Link } from "react-router";
import { ResponsiveImage } from "../../components/responsive-image/responsive-image";
import { PROFILE_COVER_SIZES } from "../../utils/image-sources";
import { joinClassNames } from "../../utils/class-names";
import type { LastSearch } from "../../utils/last-search";
import styles from "../../styles/features/stylist-profile/profile-cover.module.css";
import pageGlobal from "../../styles/features/stylist-profile/stylist-profile-page-global.module.css";

/** Share + save state and handlers shared by the cover buttons and the sticky bar. */
export interface ProfileActions {
  shareLabel: string;
  shareExpanded: "true" | "false";
  onShare: (event: MouseEvent<HTMLButtonElement>) => void;
  saved: boolean;
  saveLabel: string;
  saveTip: string;
  onToggleSaved: (event: MouseEvent<HTMLButtonElement>) => void;
}

interface ProfileCoverProps {
  name: string;
  coverUrl: string;
  back: LastSearch;
  onBack: (event: MouseEvent<HTMLAnchorElement>) => void;
  heroRef: RefObject<HTMLDivElement | null>;
  shareButtonRef: RefObject<HTMLButtonElement | null>;
  coverActionsOn: boolean;
  onToggleCoverActions: () => void;
  actions: ProfileActions;
}

/** "Back to results" row (desktop) and the cover photo with its Share / Save overlay buttons. */
export const ProfileCover = ({
  name,
  coverUrl,
  back,
  onBack,
  heroRef,
  shareButtonRef,
  coverActionsOn,
  onToggleCoverActions,
  actions,
}: ProfileCoverProps) => {
  const {
    shareLabel,
    shareExpanded,
    onShare,
    saved,
    saveLabel,
    saveTip,
    onToggleSaved,
  } = actions;

  return (
    <div className={styles.wrap}>
      {back.has && (
        <div
          data-screen-label="Back to results"
          className={joinClassNames(pageGlobal.pfDeskonly, styles.backRow)}
        >
          <Link to={back.href} onClick={onBack} className={styles.backLink}>
            <ArrowLeft size={15} strokeWidth={1.5} />
            {back.label}
          </Link>
          <span aria-hidden="true" className={styles.backDivider}></span>
          <span className={styles.backSummary}>{back.summary}</span>
        </div>
      )}
      <div className={joinClassNames(pageGlobal.pfCw, styles.coverWrap)}>
        {/* a role="img" div that toggles the overlay buttons on tap (mobile) */}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
        <div
          ref={heroRef}
          role="img"
          aria-label={name}
          onClick={onToggleCoverActions}
          className={joinClassNames(pageGlobal.scpHero, styles.hero)}
        >
          {/* without a cover the CSS shows the brand placeholder */}
          {coverUrl && (
            <ResponsiveImage
              hasShimmer
              className={styles.heroImage}
              src={coverUrl}
              sizes={PROFILE_COVER_SIZES}
              loading="eager"
              fetchPriority="high"
              alt=""
            />
          )}
        </div>
        <div
          data-on={coverActionsOn ? "true" : "false"}
          className={joinClassNames(pageGlobal.pfCov, styles.coverActions)}
        >
          {back.has && (
            <Link
              to={back.href}
              onClick={onBack}
              aria-label={back.label}
              className={joinClassNames(
                pageGlobal.pfMobonly,
                styles.mobileBack,
              )}
            >
              <ArrowLeft size={20} strokeWidth={2} />
            </Link>
          )}
          <div className={styles.coverButtons}>
            <button
              ref={shareButtonRef}
              data-tip="Share"
              onClick={onShare}
              aria-label={shareLabel}
              aria-haspopup="dialog"
              aria-expanded={shareExpanded}
              className={joinClassNames(pageGlobal.pfOvb, styles.coverButton)}
            >
              <Share size={20} strokeWidth={2} />
              <span className={pageGlobal.pfOvl}>Share</span>
            </button>
            <button
              data-tip={saveTip}
              onClick={onToggleSaved}
              aria-label={saveLabel}
              aria-pressed={saved ? "true" : "false"}
              className={joinClassNames(pageGlobal.pfOvb, styles.coverButton)}
            >
              <Heart
                size={20}
                strokeWidth={2}
                fill={saved ? "var(--accent-700)" : "none"}
                color={saved ? "#fffefb" : "currentColor"}
              />
              <span className={pageGlobal.pfOvl}>{saveTip}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
