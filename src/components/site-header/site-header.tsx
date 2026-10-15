import { Link } from "react-router";
import { FAVOURITES_HREF } from "../../hooks/use-favourites";
import { useIdentity } from "../../hooks/use-identity";
import { getAssetUrl } from "../../utils/asset-url";
import {
  AccountAvatar,
  openAccountSection,
  SiteMenu,
} from "../site-menu/site-menu";
import styles from "../../styles/components/site-header/site-header.module.css";

/** The nav links show from this width (site-header.module.css hides them up to 760px). */
const NAV_LINKS_FROM = 761;

const LINKS = [
  ["/search", "Find a stylist"],
  ["/#stylegrid", "Services"],
] as const;

interface SiteHeaderProps {
  loginHref?: string;
  /** Overrides the session's signed-in state, for pages that can sign out in place. */
  signedIn?: boolean;
  /** Defaults to the signed-in person's initials. */
  initials?: string;
  photo?: string | null;
}

/**
 * The site header: logo, Find a stylist / Services and Log in, or the account menu when signed in.
 * On mobile the links give way to the menu button for guests, and the favourites heart when signed in.
 */
export const SiteHeader = ({
  loginHref = "/login",
  signedIn,
  initials,
  photo,
}: SiteHeaderProps) => {
  const identity = useIdentity();
  const isSignedIn = signedIn ?? !!identity;

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link to="/" className={styles.logoLink}>
          <img
            src={getAssetUrl("logos/logo-crimson-sm.png")}
            alt="Tiwára's House"
            className={styles.logo}
          />
        </Link>
        <nav className={styles.nav}>
          {isSignedIn && (
            <Link
              to={FAVOURITES_HREF}
              onClick={(event) => openAccountSection(event, "favourites")}
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
          {LINKS.map(([to, label]) => (
            <Link key={to} to={to} className={styles.navLink}>
              {label}
            </Link>
          ))}
          {isSignedIn ? (
            <SiteMenu isSignedIn linksShownFrom={NAV_LINKS_FROM}>
              <AccountAvatar
                initials={initials ?? identity?.initials ?? ""}
                photo={photo}
              />
            </SiteMenu>
          ) : (
            <>
              <Link to={loginHref} className={styles.navLink}>
                Log in
              </Link>
              <SiteMenu
                isSignedIn={false}
                loginHref={loginHref}
                linksShownFrom={NAV_LINKS_FROM}
                className={styles.menuButton}
              >
                <span className={styles.menuLine}></span>
                <span className={styles.menuLine}></span>
              </SiteMenu>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
