import type { ReactNode } from "react";
import { Link } from "react-router";
import { getAssetUrl } from "../../utils/asset-url";
import styles from "../../styles/features/booking/booking-nav.module.css";

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
        Exit booking{" "}
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M18 6 6 18"></path>
          <path d="m6 6 12 12"></path>
        </svg>
      </Link>
    </div>
    {holdBar}
  </nav>
);
