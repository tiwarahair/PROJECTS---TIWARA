import type { MouseEvent } from "react";
import { Link } from "react-router";
import { resolveAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { HELP_ICON, LOG_OUT_ICON, SECTIONS } from "./account-data";
import type { AccountSection } from "./account-data";
import styles from "./account-nav.module.css";

const APPOINTMENTS = SECTIONS.slice(0, 4);
const SETTINGS = SECTIONS.slice(4);
const MEMBER_SINCE = "Member since March 2024";

interface AccountNavProps {
  current: string | null;
  accountName: string;
  initials: string;
  photo: string | null;
  onGo: (id: string) => void;
  onLogOut: () => void;
}

const Avatar = ({
  className,
  initials,
  photo,
}: {
  className?: string;
  initials: string;
  photo: string | null;
}) => (
  <span className={className} aria-hidden="true">
    {photo ? (
      <img className={styles.avatarImage} src={resolveAssetUrl(photo)} alt="" />
    ) : (
      initials
    )}
  </span>
);

const Icon = ({ path, size }: { path: string; size: number }) => (
  <svg
    className={styles.icon}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={path}></path>
  </svg>
);

const Chevron = () => (
  <span className={styles.chevron}>
    <Icon path="m9 6 6 6-6 6" size={18} />
  </span>
);

const getGoTo =
  (onGo: (id: string) => void) => (id: string) => (event: MouseEvent) => {
    event.preventDefault();
    onGo(id);
  };

/** Wide screens: the sticky side nav (prototype "Your account" <nav>). */
export const AccountSideNav = ({
  current,
  accountName,
  initials,
  photo,
  onGo,
  onLogOut,
}: AccountNavProps) => {
  const goTo = getGoTo(onGo);

  const renderLinks = (sections: AccountSection[]) => (
    <div className={styles.sideLinks}>
      {sections.map(({ id, label }) => (
        <Link
          key={id}
          className={joinClassNames(
            styles.sideLink,
            current === id ? styles.sideLinkCurrent : styles.sideLinkIdle,
          )}
          to={`/account?section=${id}`}
          onClick={goTo(id)}
          aria-current={current === id ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </div>
  );

  return (
    <nav className={styles.side} aria-label="Your account">
      <div className={styles.sideProfile}>
        <div className={styles.profile}>
          <Avatar
            className={styles.sideAvatar}
            initials={initials}
            photo={photo}
          />
          <div className={styles.profileText}>
            <div className={styles.sideName}>{accountName}</div>
            <div className={styles.memberSince}>{MEMBER_SINCE}</div>
          </div>
        </div>
      </div>
      <div>
        <h2 className={styles.sideHeading}>Your account</h2>
        {renderLinks(APPOINTMENTS)}
      </div>
      <div>
        <h2 className={styles.sideHeading}>Settings</h2>
        {renderLinks(SETTINGS)}
      </div>
      <div className={styles.sideFoot}>
        <Link className={styles.sideHelp} to="/help">
          <Icon path={HELP_ICON} size={18} />
          Help & support
        </Link>
        <button className={styles.sideLogOut} onClick={onLogOut}>
          <Icon path={LOG_OUT_ICON} size={18} />
          Log out
        </button>
      </div>
    </nav>
  );
};

/** Narrow screens without a section: the list of sections (prototype "Account list (mobile)"). */
export const AccountMobileList = ({
  accountName,
  initials,
  photo,
  onGo,
  onLogOut,
}: Omit<AccountNavProps, "current">) => {
  const goTo = getGoTo(onGo);

  const renderRows = (sections: AccountSection[]) => (
    <div className={styles.list}>
      {sections.map(({ id, label, icon }) => (
        <Link
          key={id}
          className={styles.row}
          id={`ac-row-${id}`}
          to={`/account?section=${id}`}
          onClick={goTo(id)}
        >
          <Icon path={icon} size={20} />
          <span className={styles.rowLabel}>{label}</span>
          <Chevron />
        </Link>
      ))}
    </div>
  );

  return (
    <div data-screen-label="Account list (mobile)">
      <h1 className={styles.srTitle}>Your account</h1>
      <div className={styles.profile}>
        <Avatar
          className={styles.listAvatar}
          initials={initials}
          photo={photo}
        />
        <div className={styles.profileText}>
          <div className={styles.listName}>{accountName}</div>
          <div className={styles.memberSince}>{MEMBER_SINCE}</div>
        </div>
      </div>
      <h2 className={styles.listHeading}>Your account</h2>
      {renderRows(APPOINTMENTS)}
      <h2 className={styles.listHeadingNext}>Settings</h2>
      {renderRows(SETTINGS)}
      <div className={styles.listFoot}>
        <Link className={styles.footRow} to="/help">
          <Icon path={HELP_ICON} size={20} />
          <span className={styles.footRowLabel}>Help & support</span>
          <Chevron />
        </Link>
        <button className={styles.footLogOut} onClick={onLogOut}>
          <Icon path={LOG_OUT_ICON} size={20} />
          <span className={styles.footRowLabel}>Log out</span>
        </button>
      </div>
    </div>
  );
};
