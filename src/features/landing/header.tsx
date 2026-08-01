import { useState } from "react";
import { cx } from "../../utils/class-names";
import { useScrolled } from "../../hooks/use-scrolled";
import { useOverlayActions } from "../../hooks/use-overlay-actions";
import { NAV_LINKS } from "../../data/landing-content";

/** Must stay a literal <nav>: the stylesheet targets `nav` and `nav.scrolled`. */
export function Header() {
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState(false);
  const { openSearch } = useOverlayActions();

  return (
    <nav id="mainNav" className={cx(scrolled && "scrolled")}>
      <a href="#" className="nav-logo">
        Tiwara&apos;s House<sup>✦</sup>
      </a>
      <ul className={cx("nav-links", menuOpen && "mobile-open")}>
        {NAV_LINKS.map((link) => (
          <li key={link.label + link.href}>
            <a
              href={link.href}
              className={link.className}
              onClick={(event) => {
                if (!link.opensSearch) return;
                event.preventDefault();
                openSearch("");
              }}
            >
              {link.label}
            </a>
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
