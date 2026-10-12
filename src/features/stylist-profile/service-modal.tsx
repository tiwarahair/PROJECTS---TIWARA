import { Link } from "react-router";
import { joinClassNames } from "../../utils/class-names";
import type { ServiceModal as ServiceModalData } from "./profile-logic";
import styles from "./service-modal.module.css";
import helmet from "./stylist-profile-helmet.module.css";

interface ServiceModalProps {
  service: ServiceModalData;
  onClose: () => void;
}

/** Service details: description, customisation summary, price, duration and Book. */
export const ServiceModal = ({
  service: { name, description, customisation, price, duration, href },
  onClose,
}: ServiceModalProps) => (
  // prototype: clicking anywhere on the scrim (panel included) closes it
  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
  <div
    onClick={onClose}
    className={joinClassNames(helmet.scpScrim, styles.scrim)}
  >
    <div className={joinClassNames(helmet.scpPanel, styles.panel)}>
      <div className={styles.closeRow}>
        <button onClick={onClose} aria-label="Close" className={styles.close}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18"></path>
          </svg>
        </button>
      </div>
      <h3 className={styles.title}>{name}</h3>
      <p className={styles.desc}>{description}</p>
      {!!customisation && <p className={styles.cust}>{customisation}</p>}
      <div className={styles.footer}>
        <div>
          <div className={styles.price}>{price}</div>
          <div className={styles.duration}>{duration}</div>
        </div>
        <Link to={href} className={styles.book}>
          Book
        </Link>
      </div>
    </div>
  </div>
);
