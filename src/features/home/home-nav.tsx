import type { CSSProperties } from "react";
import { Link } from "react-router";
import { useIdentity } from "../../hooks/use-identity";
import { AccountAvatar, SiteMenu } from "../../components/site-menu/site-menu";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { hexToRgba } from "./home-colours";
import page from "../../styles/features/home/home-page.module.css";
import styles from "../../styles/features/home/home-nav.module.css";
import type { NavMorphState } from "./use-nav-morph";

interface HomeNavProps {
  morph: NavMorphState;
  loggedIn: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
}

/**
 * Fixed marketing nav: centre links, Log in or the account menu, Book now,
 * and for guests on mobile the menu button and its full-screen menu.
 */
export const HomeNav = ({
  morph,
  loggedIn,
  menuOpen,
  onToggleMenu,
}: HomeNavProps) => {
  const identity = useIdentity();

  const { navSolid, navDark, navHidden, navBackground } = morph;

  return (
    <>
      <nav
        data-screen-label="Nav"
        className={joinClassNames(
          styles.nav,
          navHidden && styles.hidden,
          navSolid && styles.solid,
          navDark && styles.dark,
        )}
        // --nav-bg: the colour of the section under the nav, at .85
        style={{ "--nav-bg": hexToRgba(navBackground, 0.85) } as CSSProperties}
      >
        <div className={styles.bar}>
          <Link to="/" className={styles.logoLink}>
            <span className={styles.logoStack}>
              <img
                src={getAssetUrl("logos/logo-cream.png")}
                alt="Tiwára's House"
                className={styles.logoCream}
              />
              <span className={styles.logoMask}></span>
              <img
                src={getAssetUrl("logos/logo-crimson.png")}
                alt=""
                className={styles.logoCrimson}
              />
            </span>
          </Link>
          <div
            className={joinClassNames(
              page.mqDesk,
              page.nolinks,
              styles.centreLinks,
            )}
          >
            <Link to="/search" className={styles.navLink}>
              Find a stylist
            </Link>
            <a href="#stylegrid" className={styles.navLink}>
              Services
            </a>
            <a href="#stylists" className={styles.navLink}>
              About
            </a>
            <a href="#for-stylists" className={styles.navLink}>
              For stylists
            </a>
          </div>
          <div className={styles.right}>
            {!loggedIn && (
              <Link
                to="/login"
                className={joinClassNames(
                  page.mqDesk,
                  styles.navLink,
                  styles.logIn,
                )}
              >
                Log in
              </Link>
            )}
            {loggedIn ? (
              <SiteMenu isSignedIn className={styles.account}>
                <AccountAvatar
                  initials={identity?.initials ?? ""}
                  hasChevron={false}
                  className={styles.avatar}
                />
              </SiteMenu>
            ) : (
              <button
                className={joinClassNames(page.mqMob, styles.burger)}
                onClick={onToggleMenu}
                aria-label="Menu"
              >
                <span
                  className={joinClassNames(
                    styles.burgerLine,
                    styles.burgerLineFirst,
                  )}
                ></span>
                <span className={styles.burgerLine}></span>
              </button>
            )}
            <Link
              to="/search"
              className={joinClassNames(page.mqDesk, styles.bookNow)}
            >
              Book now
            </Link>
          </div>
        </div>
      </nav>

      {/* the dropdown menu is only different on home  */}
      {menuOpen && !loggedIn && (
        <div className={styles.menu}>
          <div className={styles.menuTop}>
            <img
              src={getAssetUrl("logos/logo-crimson.png")}
              alt="Tiwára's House"
              className={styles.menuLogo}
            />
            <button className={styles.menuClose} onClick={onToggleMenu}>
              ×
            </button>
          </div>
          <div className={joinClassNames(page.nolinks, styles.menuLinks)}>
            <Link to="/search" className={styles.menuLink}>
              Find a stylist
            </Link>
            <a
              href="#stylegrid"
              onClick={onToggleMenu}
              className={styles.menuLink}
            >
              Services
            </a>
            <a
              href="#stylists"
              onClick={onToggleMenu}
              className={styles.menuLink}
            >
              Our stylists
            </a>
            <a
              href="#for-stylists"
              onClick={onToggleMenu}
              className={styles.menuLink}
            >
              For stylists
            </a>
            <Link to="/login" className={styles.menuLink}>
              Log in
            </Link>
          </div>
          <Link to="/search" className={styles.menuBook}>
            Book now
          </Link>
        </div>
      )}
    </>
  );
};
