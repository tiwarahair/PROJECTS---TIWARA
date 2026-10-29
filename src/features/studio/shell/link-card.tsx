import { Link2, X } from "lucide-react";
import { Link } from "react-router";
import { joinClassNames } from "../../../utils/class-names";
import { copyWithToast } from "../core/format";
import { getBookingLink, getProfilePath } from "../core/model";
import type { StudioController } from "../core/use-studio";
import shared from "../../../styles/features/studio/shell/index.module.css";
import styles from "../../../styles/features/studio/shell/link-card.module.css";

/** "Your booking link is ready to share" — the wide floating card, or (narrow) the Home banner's body. */
export const LinkCardBody = ({ studio }: { studio: StudioController }) => {
  const { state, setState, actions } = studio;
  const bookingLink = getBookingLink(state);

  return (
    <>
      <div className={shared.cardHead}>
        <span className={styles.linkIcon}>
          <Link2 size={18} strokeWidth={1.9} />
        </span>
        <div className={shared.grow}>
          <div className={styles.linkTitle}>
            Your booking link is ready to share
          </div>
          <div className={styles.linkSub}>
            Clients can find and book you from it now.
          </div>
        </div>
        <button
          className={shared.cardClose}
          onClick={() => setState({ linkCard: false })}
          aria-label="Dismiss"
        >
          <X size={15} strokeWidth={1.8} />
        </button>
      </div>
      <div className={styles.linkUrl}>{bookingLink}</div>
      <div className={styles.linkActions}>
        <Link className={styles.previewProfile} to={getProfilePath(state)}>
          Preview profile
        </Link>
        <button
          className={styles.copyLink}
          onClick={() => {
            copyWithToast(bookingLink, actions.showToast);
            setState({ linkCard: false });
          }}
        >
          Copy link
        </button>
      </div>
    </>
  );
};

export const LinkCard = ({ studio }: { studio: StudioController }) => (
  <div
    className={joinClassNames(shared.floatCard, shared.setupIn)}
    role="status"
    data-screen-label="Booking link card"
  >
    <LinkCardBody studio={studio} />
  </div>
);
