import { X } from "lucide-react";
import { Link } from "react-router";
import { PhotoCarousel } from "../../components/photo-carousel";
import { joinClassNames } from "../../utils/class-names";
import type { ServiceModal as ServiceModalData } from "./profile-menu";
import styles from "../../styles/features/stylist-profile/service-modal.module.css";
import pageGlobal from "../../styles/features/stylist-profile/index-global.module.css";

interface ServiceModalProps {
  service: ServiceModalData;
  onClose: () => void;
}

/** Service details: photos, description, customisation summary, price, duration and Book. */
export const ServiceModal = ({
  service: { name, photos, description, customisation, price, duration, href },
  onClose,
}: ServiceModalProps) => (
  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
  <div
    onClick={onClose}
    className={joinClassNames(pageGlobal.scpScrim, styles.scrim)}
  >
    {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
    <div
      className={joinClassNames(pageGlobal.scpPanel, styles.panel)}
      onClick={(event) => event.stopPropagation()}
    >
      <div className={styles.closeRow}>
        <button onClick={onClose} aria-label="Close" className={styles.close}>
          <X size={20} strokeWidth={1.9} />
        </button>
      </div>
      {photos.length > 0 && (
        <PhotoCarousel
          className={styles.photos}
          photos={photos}
          sizes="(max-width: 500px) 92vw, 412px"
        />
      )}
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
