import { FavouritesHeartIcon } from "../icons/custom-icons";
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
              <FavouritesHeartIcon size={20} strokeWidth={2} />
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
