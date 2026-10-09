import { Link } from "react-router";
import { joinClassNames } from "../../utils/class-names";
import type { MenuGroup, ServiceModal } from "./profile-logic";
import styles from "./profile-services.module.css";
import helmet from "./stylist-profile-helmet.module.css";

interface ProfileServicesProps {
  groups: MenuGroup[];
  hasMore: boolean;
  showAllLabel: string;
  bookHref: string;
  onOpenService: (modal: ServiceModal) => void;
}

/** The service menu (first six services), each row opening the service modal, plus "Show all N services". */
export const ProfileServices = ({
  groups,
  hasMore,
  showAllLabel,
  bookHref,
  onOpenService,
}: ProfileServicesProps) => (
  <>
    <h2 data-rv="" className={styles.title}>
      Services
    </h2>
    {groups.map(({ key, name, hasName, items }) => (
      <div key={key} className={styles.group}>
        {hasName && <div className={styles.groupName}>{name}</div>}
        <div className={styles.rows}>
          {items.map(
            ({
              key: serviceKey,
              name: serviceName,
              meta,
              price,
              href,
              modal,
            }) => (
              <div
                key={serviceKey}
                className={joinClassNames(helmet.svcrow, styles.row)}
              >
                <button
                  onClick={() => onOpenService(modal)}
                  className={styles.rowButton}
                >
                  <div className={styles.rowName}>{serviceName}</div>
                  <div
                    className={joinClassNames(helmet.svcmeta, styles.rowMeta)}
                  >
                    {meta}
                  </div>
                </button>
                <div
                  className={joinClassNames(helmet.svcrowEnd, styles.rowEnd)}
                >
                  <span className={styles.price}>
                    <span className={styles.priceFrom}>{"from "}</span>
                    {price}
                  </span>
                  <Link to={href} className={styles.book}>
                    Book
                  </Link>
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    ))}
    {hasMore && (
      <Link to={bookHref} className={styles.showAll}>
        {showAllLabel}{" "}
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9.5 5.5L16 12l-6.5 6.5"></path>
        </svg>
      </Link>
    )}
  </>
);
