import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { FAVOURITES_HREF } from "../../hooks/use-favourites";
import { useIdentity } from "../../hooks/use-identity";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import {
  AccountMenuButton,
  AccountMenuLinks,
  getSectionClick,
} from "./site-header-account";
import type { SiteHeaderAccountMenu } from "./site-header-account";
import styles from "../../styles/components/site-header/site-header.module.css";

const LINKS = [
  ["/search", "Find a stylist"],
  ["/#stylegrid", "Services"],
] as const;

interface SiteHeaderProps {
  loginHref?: string;
  /** Overrides the session's signed-in state, for pages that can sign out in place. */
  signedIn?: boolean;
  /** Shows the account menu button and the account links in the mobile menu. */
  accountMenu?: SiteHeaderAccountMenu;
}

/** The site header: logo, Find a stylist / Services, the account button, and the mobile menu. */
export const SiteHeader = ({
  loginHref = "/login",
  signedIn,
  accountMenu,
}: SiteHeaderProps) => {
  const identity = useIdentity();
  const location = useLocation();
  // the menu stays open only on the location it was opened on, so any navigation closes it
  const [menuLocation, setMenuLocation] = useState<string | null>(null);
  const isMenuOpen = menuLocation === location.key;
  const isSignedIn = signedIn ?? !!identity;

  const toggleMenu = () => setMenuLocation(isMenuOpen ? null : location.key);

  useEffect(() => {
    if (!isMenuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuLocation(null);
    };

    document.addEventListener("keydown", closeOnEscape);

    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isMenuOpen]);

  return (
    <header
      className={joinClassNames(
        styles.header,
        accountMenu && styles.accountMode,
      )}
    >
      <div className={styles.bar}>
        <Link to="/" className={styles.logoLink}>
          <img
            src={getAssetUrl("logos/logo-crimson.png")}
            alt="Tiwára's House"
            className={styles.logo}
          />
        </Link>
        {isSignedIn && (
          <Link
            to={FAVOURITES_HREF}
            onClick={getSectionClick("favourites", accountMenu?.onSection)}
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
            isSignedIn ? styles.menuButtonLoggedIn : styles.menuButtonGuest,
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
          {!isSignedIn && (
            <Link to={loginHref} className={styles.navLink}>
              Log in
            </Link>
          )}
          {isSignedIn &&
            (accountMenu ? (
              <AccountMenuButton {...accountMenu} />
            ) : (
              <Link
                to="/account"
                data-tw-acct="1"
                aria-label="Account"
                aria-haspopup="menu"
                aria-expanded="false"
                className={styles.account}
              >
                <span aria-hidden="true" className={styles.avatar}>
                  {identity?.initials}
                </span>
              </Link>
            ))}
        </nav>
      </div>
      {isMenuOpen && (
        <div className={styles.mobilePanel}>
          {LINKS.map(([to, label]) => (
            <Link key={to} to={to} className={styles.mobileLink}>
              {label}
            </Link>
          ))}
          {!isSignedIn && (
            <Link to={loginHref} className={styles.mobileLink}>
              Log in
            </Link>
          )}
          {isSignedIn &&
            (accountMenu ? (
              <AccountMenuLinks {...accountMenu} />
            ) : (
              <Link
                to="/account?section=personal"
                className={styles.mobileLink}
              >
                Account
              </Link>
            ))}
        </div>
      )}
    </header>
  );
};
