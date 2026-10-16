import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { getAssetUrl } from "../../utils/asset-url";
import styles from "../../styles/features/booking/nav.module.css";

interface BookingNavProps {
  exitHref: string;
  holdBar: ReactNode;
}

/** Logo and "Exit booking" (both ask before leaving once a service is chosen), plus the mobile hold bar. */
export const BookingNav = ({ exitHref, holdBar }: BookingNavProps) => (
  <nav className={styles.nav}>
    <div className={styles.bar}>
      <Link to="/" className={styles.logoLink}>
        <img
          src={getAssetUrl("logos/logo-crimson-sm.png")}
          alt="Tiwára's House"
          className={styles.logo}
        />
      </Link>
      <Link to={exitHref} className={styles.exit}>
        Exit booking <X size={15} strokeWidth={2} />
      </Link>
    </div>
    {holdBar}
  </nav>
);
