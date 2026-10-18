import type { CSSProperties } from "react";
import { SOCIAL_ICONS, SocialIcon } from "../../components/icons/brand-icons";
import { LinkIcon, Mail } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/features/stylist-profile/share-popover.module.css";
import pageGlobal from "../../styles/features/stylist-profile/index-global.module.css";
import type { SharePosition } from "./use-share-popover";

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
        <LinkIcon size={18} strokeWidth={2.25} />
        Copy link
      </button>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener"
        onClick={onClose}
        className={styles.link}
      >
        <SocialIcon icon={SOCIAL_ICONS.whatsapp} size={18} />
        WhatsApp
      </a>
      <a href={mailHref} onClick={onClose} className={styles.link}>
        <Mail size={18} strokeWidth={2.25} />
        Email
      </a>
    </div>
  );
};
