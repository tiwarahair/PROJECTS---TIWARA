import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { joinClassNames } from "../../utils/class-names";
import type { MenuGroup, ServiceModal } from "./profile-menu";
import styles from "../../styles/features/stylist-profile/profile-services.module.css";
import pageGlobal from "../../styles/features/stylist-profile/index-global.module.css";

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
                className={joinClassNames(pageGlobal.svcrow, styles.row)}
              >
                <button
                  onClick={() => onOpenService(modal)}
                  className={styles.rowButton}
                >
                  <div className={styles.rowName}>{serviceName}</div>
                  <div
                    className={joinClassNames(
                      pageGlobal.svcmeta,
                      styles.rowMeta,
                    )}
                  >
                    {meta}
                  </div>
                </button>
                <div
                  className={joinClassNames(
                    pageGlobal.svcrowEnd,
                    styles.rowEnd,
                  )}
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
        {showAllLabel} <ChevronRight size={15} strokeWidth={1.9} />
      </Link>
    )}
  </>
);
