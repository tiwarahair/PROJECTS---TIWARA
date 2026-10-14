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

/** The centre links show from this width (home-page.module.css .mqDesk hides them up to 900px). */
const NAV_LINKS_FROM = 901;

interface HomeNavProps {
  morph: NavMorphState;
  loggedIn: boolean;
}

/** Fixed marketing nav: centre links, Log in or the account menu, Book now, and the site menu button on mobile. */
export const HomeNav = ({ morph, loggedIn }: HomeNavProps) => {
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
              <SiteMenu
                isSignedIn
                className={styles.account}
                linksShownFrom={NAV_LINKS_FROM}
              >
                <AccountAvatar
                  initials={identity?.initials ?? ""}
                  hasChevron={false}
                  className={styles.avatar}
                />
              </SiteMenu>
            ) : (
              <SiteMenu
                isSignedIn={false}
                className={joinClassNames(page.mqMob, styles.burger)}
                linksShownFrom={NAV_LINKS_FROM}
              >
                <span
                  className={joinClassNames(
                    styles.burgerLine,
                    styles.burgerLineFirst,
                  )}
                ></span>
                <span className={styles.burgerLine}></span>
              </SiteMenu>
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
    </>
  );
};
