import type { MouseEvent } from "react";
import { Link } from "react-router";
import { getAssetUrl, resolveAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { SECTIONS } from "./account-data";
import helmet from "./account-helmet.module.css";
import styles from "./account-header.module.css";

const MOBILE_LINKS = [
  ["bookings", "Bookings"],
  ["favourites", "Favourites"],
  ["personal", "Account settings"],
] as const;

const HEART_PATH = SECTIONS.find(({ id }) => id === "favourites")?.icon ?? "";

interface AccountHeaderProps {
  loggedIn: boolean;
  loginHref: string;
  accountName: string;
  initials: string;
  photo: string | null;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onGo: (id: string) => void;
  onLogOut: () => void;
}

/** Logo, desktop links + account button / mobile favourites + menu, and the mobile menu panel. */
export const AccountHeader = ({
  loggedIn,
  loginHref,
  accountName,
  initials,
  photo,
  menuOpen,
  onToggleMenu,
  onGo,
  onLogOut,
}: AccountHeaderProps) => {
  const goTo = (id: string) => (event: MouseEvent) => {
    event.preventDefault();
    onGo(id);
  };
  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link className={styles.logoLink} to="/">
          <img
            className={styles.logo}
            src={getAssetUrl("_ds_assets/logo-crimson.png")}
            alt="Tiwára's House"
          />
        </Link>
        <div className={joinClassNames(helmet.acMob, styles.mobActions)}>
          {loggedIn && (
            <Link
              className={styles.mobFav}
              to="/account?section=favourites"
              onClick={goTo("favourites")}
              aria-label="Favourites"
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
                <path d={HEART_PATH}></path>
              </svg>
            </Link>
          )}
          <button
            className={styles.menuButton}
            onClick={onToggleMenu}
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            <span className={styles.menuLine}></span>
            <span className={styles.menuLine}></span>
          </button>
        </div>
        <nav className={joinClassNames(helmet.acDesk, styles.desk)}>
          <Link className={styles.deskLink} to="/search">
            Find a stylist
          </Link>
          <Link className={styles.deskLink} to="/#services">
            Services
          </Link>
          {loggedIn && (
            <button
              className={styles.accountButton}
              data-tw-acct="1"
              aria-haspopup="menu"
              aria-expanded="false"
              aria-label={accountName}
            >
              <span className={styles.accountAvatar} aria-hidden="true">
                {photo ? (
                  <img
                    className={styles.avatarImage}
                    src={resolveAssetUrl(photo)}
                    alt=""
                  />
                ) : (
                  initials
                )}
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6"></path>
              </svg>
            </button>
          )}
          {!loggedIn && (
            <Link className={styles.deskLink} to={loginHref}>
              Log in
            </Link>
          )}
        </nav>
      </div>
      {menuOpen && (
        <div className={joinClassNames(helmet.acMob, styles.mobMenu)}>
          <Link className={styles.mobLink} to="/search">
            Find a stylist
          </Link>
          <Link className={styles.mobLink} to="/#services">
            Services
          </Link>
          {loggedIn && (
            <>
              <div className={styles.mobName}>{accountName}</div>
              {MOBILE_LINKS.map(([id, label]) => (
                <Link
                  key={id}
                  className={styles.mobLink}
                  to={"/account?section=" + id}
                  onClick={goTo(id)}
                >
                  {label}
                </Link>
              ))}
              <Link className={styles.mobLink} to="/help">
                Help & support
              </Link>
              <button className={styles.mobLogOut} onClick={onLogOut}>
                Log out
              </button>
            </>
          )}
          {!loggedIn && (
            <Link className={styles.mobLink} to={loginHref}>
              Log in
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
