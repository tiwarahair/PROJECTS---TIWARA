import { useOverlayActions } from "../../hooks/use-overlay-actions";
import { useAppDispatch } from "../../stores/hooks";
import { pageOpened } from "../../stores/overlays-slice";
import {
  FOOTER_COLUMNS,
  FOOTER_SOCIALS,
} from "../../data/other/landing-content";

export function Footer() {
  const { openSearch } = useOverlayActions();
  const dispatch = useAppDispatch();

  return (
    <footer id="contact">
      <div className="footer-top">
        <div className="footer-brand">
          <div className="footer-logo-text">
            Tiwara&apos;s House<sup>✦</sup>
          </div>
          <p>
            The UK&apos;s premier booking platform for textured hair. Connecting
            clients with world-class stylists — transparent pricing, effortless
            booking.
          </p>
          <div className="footer-social">
            {FOOTER_SOCIALS.map(({ label, title, href }) => (
              <a
                key={label}
                href={href}
                title={title}
                target="_blank"
                rel="noopener noreferrer"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
        {FOOTER_COLUMNS.map(({ heading, links }) => (
          <div key={heading} className="footer-col">
            <h4>{heading}</h4>
            <ul>
              {links.map(({ label, href, searchFilter, page }) => (
                <li key={label}>
                  <a
                    href={href}
                    onClick={(event) => {
                      if (page) {
                        event.preventDefault();
                        dispatch(pageOpened(page));
                        return;
                      }
                      if (searchFilter === undefined) return;
                      event.preventDefault();
                      openSearch(searchFilter);
                    }}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="footer-bottom">
        <span>© 2026 Tiwara&apos;s House. All rights reserved.</span>
        <span>Made with love for the community · UK-wide</span>
        <span>
          <a href="#">GDPR</a> · <a href="#">Cookies</a> · <a href="#">Terms</a>
        </span>
      </div>
    </footer>
  );
}
