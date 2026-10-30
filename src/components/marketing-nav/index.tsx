import type { CSSProperties } from "react";
import { Link, NavLink } from "react-router";
import { useIdentity } from "../../hooks/use-identity";
import type { NavMorphState } from "../../hooks/use-nav-morph";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { hexToRgba } from "../../utils/colours";
import { HomeSectionLink } from "../home-section-link";
import { AccountAvatar, SiteMenu } from "../site-menu";
import styles from "../../styles/components/marketing-nav/index.module.css";

/** The centre links show from this width */
const NAV_LINKS_FROM = 901;

interface MarketingNavProps {
  morph: NavMorphState;
  loggedIn: boolean;
}

export const MarketingNav = ({ morph, loggedIn }: MarketingNavProps) => {
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
                src={getAssetUrl("logos/logo-cream-sm.png")}
                alt="Tiwára's House"
                className={styles.logoCream}
              />
              <span className={styles.logoMask}></span>
              <img
                src={getAssetUrl("logos/logo-crimson-sm.png")}
                alt=""
                className={styles.logoCrimson}
              />
            </span>
          </Link>
          <div
            className={joinClassNames(styles.desktopOnly, styles.centreLinks)}
          >
            <NavLink to="/search" className={styles.navLink}>
              Find a stylist
            </NavLink>
            <HomeSectionLink hash="#stylegrid" className={styles.navLink}>
              Services
            </HomeSectionLink>
            <NavLink to="/about" className={styles.navLink}>
              About
            </NavLink>
            <NavLink to="/for-stylists" className={styles.navLink}>
              For stylists
            </NavLink>
          </div>
          <div className={styles.right}>
            {!loggedIn && (
              <Link
                to="/login"
                className={joinClassNames(
                  styles.desktopOnly,
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
                className={joinClassNames(styles.mobileOnly, styles.burger)}
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
              className={joinClassNames(styles.desktopOnly, styles.bookNow)}
            >
              Book now
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
};
