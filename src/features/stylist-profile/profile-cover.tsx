import type { CSSProperties, MouseEvent, RefObject } from "react";
import { Link } from "react-router";
import { joinClassNames } from "../../utils/class-names";
import type { LastSearch } from "../../utils/last-search";
import { BackPath, HeartPath, SharePaths } from "./profile-icons";
import styles from "./profile-cover.module.css";
import helmet from "./stylist-profile-helmet.module.css";

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

  // heroStyle backgroundImage: the stylist's cover photo
  const heroStyle = {
    "--hero-image": coverUrl ? `url("${coverUrl}")` : "none",
  } as CSSProperties;

  return (
    <div className={styles.wrap}>
      {back.has && (
        <div
          data-screen-label="Back to results"
          className={joinClassNames(helmet.pfDeskonly, styles.backRow)}
        >
          <Link to={back.href} onClick={onBack} className={styles.backLink}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <BackPath />
            </svg>
            {back.label}
          </Link>
          <span aria-hidden="true" className={styles.backDivider}></span>
          <span className={styles.backSummary}>{back.summary}</span>
        </div>
      )}
      <div className={joinClassNames(helmet.pfCw, styles.coverWrap)}>
        {/* prototype: a role="img" div that toggles the overlay buttons on tap (mobile) */}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
        <div
          ref={heroRef}
          role="img"
          aria-label={name}
          onClick={onToggleCoverActions}
          className={joinClassNames(helmet.scpHero, styles.hero)}
          style={heroStyle}
        ></div>
        <div
          data-on={coverActionsOn ? "true" : "false"}
          className={joinClassNames(helmet.pfCov, styles.coverActions)}
        >
          {back.has && (
            <Link
              to={back.href}
              onClick={onBack}
              aria-label={back.label}
              className={joinClassNames(helmet.pfMobonly, styles.mobileBack)}
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
          <div className={styles.coverButtons}>
            <button
              ref={shareButtonRef}
              data-tip="Share"
              onClick={onShare}
              aria-label={shareLabel}
              aria-haspopup="dialog"
              aria-expanded={shareExpanded}
              className={joinClassNames(helmet.pfOvb, styles.coverButton)}
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
                <SharePaths />
              </svg>
              <span className={helmet.pfOvl}>Share</span>
            </button>
            <button
              data-tip={saveTip}
              onClick={onToggleSaved}
              aria-label={saveLabel}
              aria-pressed={saved ? "true" : "false"}
              className={joinClassNames(helmet.pfOvb, styles.coverButton)}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill={saved ? "var(--accent-700)" : "none"}
                stroke={saved ? "#fffefb" : "currentColor"}
                strokeWidth="2"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <HeartPath />
              </svg>
              <span className={helmet.pfOvl}>{saveTip}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
