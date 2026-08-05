import { useState } from "react";
import { Link } from "react-router";
import { cx } from "../../utils/class-names";
import { useScrolled } from "../../hooks/use-scrolled";
import { NAV_LINKS } from "../../data/other/landing-content";
import { PATH } from "../../routes/routes";

/* hidden if the file is missing. TO DO: add logo */
const LOGO_SRC = "/assets/logo.svg";
interface HeaderProps {
  /**
   * Pages render the nav over a cream background, where its default
   * cream-on-transparent styling would be invisible. They pin it to the
   * `.scrolled` look instead — which is also the only option that works, since
   * a page is no longer its own scroll container for `useScrolled` to watch.
   */
  solid?: boolean;
}

/** Must stay a literal <nav>: the stylesheet targets `nav` and `nav.scrolled`. */
export function Header({ solid = false }: HeaderProps) {
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav id="mainNav" className={cx((solid || scrolled) && "scrolled")}>
      <Link to={PATH.home} className="nav-logo">
        <img
          src={LOGO_SRC}
          alt=""
          className="nav-logo-img"
          onError={(event) => {
            // TO DO
            // look at class 'nav-logo-img' as well
            event.currentTarget.style.display = "none";
          }}
        />
        <span className="nav-logo-text">
          Tiwara&apos;s House<sup>✦</sup>
        </span>
      </Link>
      <ul className={cx("nav-links", menuOpen && "mobile-open")}>
        {NAV_LINKS.map(({ label, to, className }) => (
          <li key={label + to}>
            <Link
              to={to}
              className={className}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="nav-burger" onClick={() => setMenuOpen((open) => !open)}>
        <span />
        <span />
        <span />
      </div>
    </nav>
  );
}
