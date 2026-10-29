import { Link } from "react-router";
import { SOCIAL_ICONS, SocialIcon } from "../../components/icons/brand-icons";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import page from "../../styles/features/home/index.module.css";
import styles from "../../styles/features/home/footer.module.css";

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
      { label: "Contact", href: "/help" },
      { label: "Policies", href: "#faq" },
    ],
  },
];

const SOCIAL_LINKS = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/tiwarashouse/",
    size: 18,
    icon: SOCIAL_ICONS.instagram,
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@tiwarashouse",
    size: 18,
    icon: SOCIAL_ICONS.tiktok,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@TiwarasHouse",
    size: 21,
    icon: SOCIAL_ICONS.youtube,
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
              src={getAssetUrl("logos/logo-cream.png")}
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
                <SocialIcon icon={icon} size={size} />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.bottom}>
        <span>© {new Date().getFullYear()} Tiwára&apos;s House.</span>
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
