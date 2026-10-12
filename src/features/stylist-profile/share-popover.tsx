import type { CSSProperties } from "react";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/features/stylist-profile/share-popover.module.css";
import pageGlobal from "../../styles/features/stylist-profile/stylist-profile-page-global.module.css";
import type { SharePosition } from "./use-stylist-profile";

interface SharePopoverProps {
  position: SharePosition;
  whatsappHref: string;
  mailHref: string;
  onCopy: () => void;
  onClose: () => void;
}

/** Copy link / WhatsApp / Email, anchored under the Share button that opened it. */
export const SharePopover = ({
  position: { top, right },
  whatsappHref,
  mailHref,
  onCopy,
  onClose,
}: SharePopoverProps) => {
  // measured from the Share button when it opened
  const positionStyle = {
    "--share-top": top,
    "--share-right": right,
  } as CSSProperties;

  return (
    // clicks inside stay open (the document click listener closes it)
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <div
      data-screen-label="Share popover"
      role="dialog"
      aria-label="Share this stylist"
      onClick={(event) => event.stopPropagation()}
      className={joinClassNames(
        pageGlobal.pfPop,
        styles.popover,
        styles.position,
      )}
      style={positionStyle}
    >
      <div className={styles.title}>Share this stylist</div>
      <button onClick={onCopy} className={styles.copy}>
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
          <path d="M10 13.5a4.5 4.5 0 0 0 6.4.4l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2"></path>
          <path d="M14 10.5a4.5 4.5 0 0 0-6.4-.4l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"></path>
        </svg>
        Copy link
      </button>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener"
        onClick={onClose}
        className={styles.link}
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
          <path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.3z"></path>
          <path d="M9 8.8c0 3.3 2.9 6.2 6.2 6.2l1.1-1.6-2-1-1 .8a4.3 4.3 0 0 1-2.5-2.5l.8-1-1-2z"></path>
        </svg>
        WhatsApp
      </a>
      <a href={mailHref} onClick={onClose} className={styles.link}>
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
          <rect x="2.5" y="4.5" width="19" height="15" rx="3"></rect>
          <path d="m3.5 6.5 8.5 6.5 8.5-6.5"></path>
        </svg>
        Email
      </a>
    </div>
  );
};
