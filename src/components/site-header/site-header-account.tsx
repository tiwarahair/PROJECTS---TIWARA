import type { MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAppDispatch } from "../../stores/hooks";
import { logOut } from "../../stores/session-slice";
import { resolveAssetUrl } from "../../utils/asset-url";
import styles from "../../styles/components/site-header/site-header.module.css";

/** The account-page style of the header: an account menu button and the account links in the mobile menu. */
export interface SiteHeaderAccountMenu {
  /** The account button's label and the mobile menu's account heading. */
  label: string;
  initials: string;
  photo?: string | null;
  /** Opens an account section in place instead of following its link. */
  onSection?: (section: string) => void;
}

const SECTION_LINKS = [
  ["bookings", "Bookings"],
  ["favourites", "Favourites"],
  ["personal", "Account settings"],
] as const;

/** Click handler for a link to an account section: hands it to onSection when there is one. */
export const getSectionClick =
  (section: string, onSection?: (section: string) => void) =>
  (event: MouseEvent) => {
    if (!onSection) return;

    event.preventDefault();
    onSection(section);
  };

/** Desktop account button: photo or initials and a chevron; it opens the account menu. */
export const AccountMenuButton = ({
  label,
  initials,
  photo,
}: SiteHeaderAccountMenu) => (
  <button
    className={styles.accountButton}
    data-tw-acct="1"
    aria-label={label}
    aria-haspopup="menu"
    aria-expanded="false"
  >
    <span className={styles.avatar} aria-hidden="true">
      {photo ? (
        <img
          className={styles.avatarImage}
          src={resolveAssetUrl(photo)}
          alt=""
        />
      ) : (
        initials
      )}
    </span>
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6"></path>
    </svg>
  </button>
);

/** Mobile menu account links: the account heading, its sections, Help & support and Log out. */
export const AccountMenuLinks = ({
  label,
  onSection,
}: SiteHeaderAccountMenu) => {
  const { pathname } = useLocation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isHelpPage = pathname === "/help";

  const logout = () => {
    dispatch(logOut());
    navigate("/");
  };

  return (
    <>
      <div className={styles.mobileHeading}>{label}</div>
      {SECTION_LINKS.map(([section, sectionLabel]) => (
        <Link
          key={section}
          className={styles.mobileLink}
          to={`/account?section=${section}`}
          onClick={getSectionClick(section, onSection)}
        >
          {sectionLabel}
        </Link>
      ))}
      <Link
        className={isHelpPage ? styles.mobileLinkCurrent : styles.mobileLink}
        to="/help"
        aria-current={isHelpPage ? "page" : undefined}
      >
        Help & support
      </Link>
      <button className={styles.logOut} onClick={logout}>
        Log out
      </button>
    </>
  );
};
