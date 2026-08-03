import { useState } from "react";
import { cx } from "../../utils/class-names";
import { useScrolled } from "../../hooks/use-scrolled";
import { useOverlayActions } from "../../hooks/use-overlay-actions";
import { useAppDispatch } from "../../stores/hooks";
import { pageOpened } from "../../stores/overlays-slice";
import { NAV_LINKS } from "../../data/other/landing-content";
import type { NavAction } from "../../types/content";

/* hidden if the file is missing. TO DO: add logo */
const LOGO_SRC = "/assets/logo.svg";

/** Must stay a literal <nav>: the stylesheet targets `nav` and `nav.scrolled`. */
export function Header() {
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState(false);
  const { openSearch } = useOverlayActions();
  const dispatch = useAppDispatch();

  function runAction(action: NavAction) {
    if (action.kind === "search") openSearch("");
    else dispatch(pageOpened(action.page));
  }

  return (
    <nav id="mainNav" className={cx(scrolled && "scrolled")}>
      <a href="#" className="nav-logo">
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
      </a>
      <ul className={cx("nav-links", menuOpen && "mobile-open")}>
        {NAV_LINKS.map((link) => (
          <li key={link.label + link.href}>
            <a
              href={link.href}
              className={link.className}
              onClick={(event) => {
                if (!link.action) return;
                event.preventDefault();
                runAction(link.action);
                setMenuOpen(false);
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
