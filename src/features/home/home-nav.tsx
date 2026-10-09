import type { CSSProperties } from "react";
import { Link } from "react-router";
import { DEMO_ACCOUNT } from "../../stores/session-slice";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { hexToRgba } from "./home-colours";
import page from "./home-page.module.css";
import styles from "./home-nav.module.css";
import type { NavMorphState } from "./use-nav-morph";

const ACCOUNT_INITIALS = DEMO_ACCOUNT.name
  .split(" ")
  .filter(Boolean)
  .map((word) => word[0])
  .slice(0, 2)
  .join("")
  .toUpperCase();

interface HomeNavProps {
  morph: NavMorphState;
  loggedIn: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
}

/** Fixed marketing nav + full-screen mobile menu (prototype Home "Nav"). */
export const HomeNav = ({
  morph,
  loggedIn,
  menuOpen,
  onToggleMenu,
}: HomeNavProps) => {
  const { navSolid, navDark, navHidden, navBg } = morph;
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
        style={{ "--nav-bg": hexToRgba(navBg, 0.85) } as CSSProperties}
      >
        <div className={styles.bar}>
          <Link to="/" className={styles.logoLink}>
            <span className={styles.logoStack}>
              <img
                src={getAssetUrl("_ds_assets/logo-cream.png")}
                alt="Tiwára's House"
                className={styles.logoCream}
              />
              <span className={styles.logoMask}></span>
              <img
                src={getAssetUrl("_ds_assets/logo-crimson.png")}
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
            <a href="#services" className={styles.navLink}>
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
            <div
              className={joinClassNames(
                page.mqDesk,
                page.nolinks,
                styles.rightLinks,
              )}
            >
              {!loggedIn && (
                <Link to="/onboarding" className={styles.navLink}>
                  Log in
                </Link>
              )}
              {loggedIn && (
                <Link
                  to="/account"
                  data-tw-acct="1"
                  aria-label={DEMO_ACCOUNT.name}
                  aria-haspopup="menu"
                  aria-expanded="false"
                  className={styles.account}
                >
                  <span aria-hidden="true" className={styles.avatar}>
                    {ACCOUNT_INITIALS}
                  </span>
                </Link>
              )}
              <Link to="/search" className={styles.bookNow}>
                Book now
              </Link>
            </div>
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
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div className={styles.menu}>
          <div className={styles.menuTop}>
            <img
              src={getAssetUrl("_ds_assets/logo-crimson.png")}
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
              href="#services"
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
            {!loggedIn && (
              <Link to="/onboarding" className={styles.menuLink}>
                Log in
              </Link>
            )}
            {loggedIn && (
              <Link to="/account?section=personal" className={styles.menuLink}>
                {DEMO_ACCOUNT.name}
              </Link>
            )}
          </div>
          <Link to="/search" className={styles.menuBook}>
            Book now
          </Link>
        </div>
      )}
    </>
  );
};
