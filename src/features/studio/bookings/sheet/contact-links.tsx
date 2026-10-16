import type { LucideIcon } from "lucide-react";
import { CONTACT_ICONS } from "../../core/constants";
import styles from "../../../../styles/features/studio/bookings/sheet/contact-links.module.css";

interface ContactLinksProps {
  telHref: string;
  smsHref: string;
  mailHref: string;
  hasPhone: boolean;
  hasEmail: boolean;
}

/** Call / text / email buttons beside a client (booking and past sheets). */
export const ContactLinks = ({
  telHref,
  smsHref,
  mailHref,
  hasPhone,
  hasEmail,
}: ContactLinksProps) => {
  const link = (href: string, label: string, ContactIcon: LucideIcon) => (
    <a
      className={styles.contact}
      href={href}
      onClick={(event) => event.stopPropagation()}
      aria-label={label}
      title={label}
    >
      <span className={styles.hitArea} aria-hidden="true"></span>
      <ContactIcon size={18} strokeWidth={1.7} />
    </a>
  );

  return (
    <span className={styles.contacts}>
      {hasPhone && link(telHref, "Call client", CONTACT_ICONS.call)}
      {hasPhone && link(smsHref, "Text client", CONTACT_ICONS.text)}
      {hasEmail && link(mailHref, "Email client", CONTACT_ICONS.mail)}
    </span>
  );
};
