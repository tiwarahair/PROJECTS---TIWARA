import { Link } from "react-router";
import { FAVOURITES_HREF } from "../../hooks/use-favourites";
import { ACCOUNT_INITIALS } from "../../stores/session-slice";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { HeartPath } from "./profile-icons";
import styles from "../../styles/features/stylist-profile/profile-header.module.css";
import helmet from "../../styles/features/stylist-profile/stylist-profile-helmet.module.css";

interface ProfileHeaderProps {
  loggedIn: boolean;
  loginHref: string;
  menuOpen: boolean;
  onToggleMenu: () => void;
}

/** Logo, desktop links / mobile favourites + menu, and the mobile menu panel. */
export const ProfileHeader = ({
  loggedIn,
  loginHref,
  menuOpen,
  onToggleMenu,
}: ProfileHeaderProps) => (
  <header className={styles.header}>
    <div className={styles.bar}>
      <Link to="/" className={styles.logoLink}>
        <img
          src={getAssetUrl("logos/logo-crimson.png")}
          alt="Tiwára's House"
          className={styles.logo}
        />
      </Link>
      {loggedIn && (
        <Link
          to={FAVOURITES_HREF}
          aria-label="Favourites"
          className={joinClassNames(helmet.scpMob, styles.favourites)}
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
            <HeartPath />
          </svg>
        </Link>
      )}
      <button
        onClick={onToggleMenu}
        aria-label="Menu"
        className={joinClassNames(
          helmet.scpMob,
          styles.menuButton,
          loggedIn ? styles.menuButtonLoggedIn : styles.menuButtonGuest,
        )}
      >
        <span className={styles.menuLine}></span>
        <span className={styles.menuLine}></span>
      </button>
      <nav className={joinClassNames(helmet.scpDesk, styles.desktopNav)}>
        <Link to="/search" className={styles.navLink}>
          Find a stylist
        </Link>
        <Link to="/#stylegrid" className={styles.navLink}>
          Services
        </Link>
        {!loggedIn && (
          <Link to={loginHref} className={styles.navLink}>
            Log in
          </Link>
        )}
        {loggedIn && (
          <Link
            to="/account"
            data-tw-acct="1"
            aria-label="Account"
            aria-haspopup="menu"
            aria-expanded="false"
            className={styles.account}
          >
            <span aria-hidden="true" className={styles.avatar}>
              {ACCOUNT_INITIALS}
            </span>
          </Link>
        )}
      </nav>
    </div>
    {menuOpen && (
      <div className={joinClassNames(helmet.scpMobPanel, styles.mobilePanel)}>
        <Link to="/search" onClick={onToggleMenu} className={styles.mobileLink}>
          Find a stylist
        </Link>
        <Link
          to="/#stylegrid"
          onClick={onToggleMenu}
          className={styles.mobileLink}
        >
          Services
        </Link>
        {!loggedIn && (
          <Link
            to={loginHref}
            onClick={onToggleMenu}
            className={styles.mobileLink}
          >
            Log in
          </Link>
        )}
        {loggedIn && (
          <Link
            to="/account?section=personal"
            onClick={onToggleMenu}
            className={styles.mobileLink}
          >
            Account
          </Link>
        )}
      </div>
    )}
  </header>
);
