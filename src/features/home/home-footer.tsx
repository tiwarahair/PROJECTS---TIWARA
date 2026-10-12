import { Link } from "react-router";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import page from "./home-page.module.css";
import styles from "./home-footer.module.css";

const LINK_GROUPS = [
  {
    title: "Clients",
    links: [
      { label: "Find a stylist", to: "/search" },
      { label: "FAQs", href: "#faq" },
    ],
  },
  {
    title: "Stylists",
    links: [
      { label: "List your business", to: "/join" },
      { label: "Tiwára's Studio", to: "/login?flow=pro" },
      { label: "Why join", href: "#for-stylists" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#about" },
      { label: "Contact", href: "#faq" },
      { label: "Policies", href: "#faq" },
    ],
  },
];

const SOCIAL_LINKS = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/tiwarashouse/",
    size: 18,
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5"></rect>
        <circle cx="12" cy="12" r="4"></circle>
        <circle cx="17.2" cy="6.8" r="1"></circle>
      </>
    ),
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@tiwarashouse",
    size: 18,
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5"></rect>
        <path d="M13.4 7.4v6.1a2.3 2.3 0 1 1-2.3-2.3"></path>
        <path d="M13.4 7.4c.3 1.3 1.3 2.2 2.6 2.3"></path>
      </>
    ),
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@TiwarasHouse",
    size: 21,
    icon: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="4"></rect>
        <path d="M10.4 9.2l4.4 2.8-4.4 2.8z"></path>
      </>
    ),
  },
];

/** Ink footer. */
export const HomeFooter = () => (
  <footer data-screen-label="Footer" className={styles.footer}>
    <div className={styles.inner}>
      <div className={joinClassNames(page.ftcols, styles.columns)}>
        <div className={styles.brand}>
          <a href="#" aria-label="Back to top" className={styles.logoLink}>
            <img
              src={getAssetUrl("logo-cream.png")}
              alt="Tiwára's House"
              className={styles.logo}
            />
          </a>
          <p className={styles.about}>
            Afro hair booking, done properly. Find vetted stylists across the UK
            — discovery, booking and payment all in one place.
          </p>
        </div>
        <div className={joinClassNames(page.nolinks, styles.linkGroups)}>
          {LINK_GROUPS.map(({ title, links }) => (
            <div key={title} className={styles.linkGroup}>
              <div className={styles.groupTitle}>{title}</div>
              {links.map(({ label, to, href }) =>
                to ? (
                  <Link key={label} to={to} className={styles.link}>
                    {label}
                  </Link>
                ) : (
                  <a key={label} href={href} className={styles.link}>
                    {label}
                  </a>
                ),
              )}
            </div>
          ))}
        </div>
        <div className={styles.social}>
          <div className={styles.groupTitle}>FOLLOW US</div>
          <div className={styles.socialLinks}>
            {SOCIAL_LINKS.map(({ label, href, size, icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener"
                aria-label={label}
                className={styles.socialLink}
              >
                <svg
                  width={size}
                  height={size}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {icon}
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.bottom}>
        <span>© 2026 Tiwára&apos;s House.</span>
        <div className={joinClassNames(page.nolinks, styles.legal)}>
          <a href="#faq" className={styles.legalLink}>
            Privacy policy
          </a>
          <a href="#faq" className={styles.legalLink}>
            Terms of service
          </a>
        </div>
      </div>
    </div>
  </footer>
);
