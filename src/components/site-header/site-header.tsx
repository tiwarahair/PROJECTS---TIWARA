import { useState } from "react";
import { Link } from "react-router";
import { FAVOURITES_HREF } from "../../hooks/use-favourites";
import { useIdentity } from "../../hooks/use-identity";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/site-header/site-header.module.css";

const LINKS = [
  ["/search", "Find a stylist"],
  ["/#stylegrid", "Services"],
] as const;

/** The site header: logo, Find a stylist / Services, the account button, and the mobile menu. */
export const SiteHeader = () => {
  const identity = useIdentity();
  const [isMenuOpen, setMenuOpen] = useState(false);
  const toggleMenu = () => setMenuOpen((isOpen) => !isOpen);

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link to="/" className={styles.logoLink}>
          <img
            src={getAssetUrl("logos/logo-crimson.png")}
            alt="Tiwára's House"
            className={styles.logo}
          />
        </Link>
        {identity && (
          <Link
            to={FAVOURITES_HREF}
            aria-label="Favourites"
            className={styles.favourites}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z" />
            </svg>
          </Link>
        )}
        <button
          onClick={toggleMenu}
          aria-label="Menu"
          aria-expanded={isMenuOpen}
          className={joinClassNames(
            styles.menuButton,
            identity ? styles.menuButtonLoggedIn : styles.menuButtonGuest,
          )}
        >
          <span className={styles.menuLine}></span>
          <span className={styles.menuLine}></span>
        </button>
        <nav className={styles.desktopNav}>
          {LINKS.map(([to, label]) => (
            <Link key={to} to={to} className={styles.navLink}>
              {label}
            </Link>
          ))}
          {!identity && (
            <Link to="/login" className={styles.navLink}>
              Log in
            </Link>
          )}
          {identity && (
            <Link to="/account" aria-label="Account" className={styles.account}>
              <span aria-hidden="true" className={styles.avatar}>
                {identity.initials}
              </span>
            </Link>
          )}
        </nav>
      </div>
      {isMenuOpen && (
        <div className={styles.mobilePanel}>
          {LINKS.map(([to, label]) => (
            <Link
              key={to}
              to={to}
              onClick={toggleMenu}
              className={styles.mobileLink}
            >
              {label}
            </Link>
          ))}
          <Link
            to={identity ? "/account?section=personal" : "/login"}
            onClick={toggleMenu}
            className={styles.mobileLink}
          >
            {identity ? "Account" : "Log in"}
          </Link>
        </div>
      )}
    </header>
  );
};
