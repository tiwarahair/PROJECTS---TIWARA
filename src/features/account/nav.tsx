import { ChevronRight, CircleQuestionMark, LogOut } from "lucide-react";
import type { MouseEvent } from "react";
import { Link } from "react-router";
import { AccountPhoto } from "../../components/account-photo";
import { joinClassNames } from "../../utils/class-names";
import { SECTIONS } from "./data";
import type { AccountSection } from "./data";
import styles from "../../styles/features/account/nav.module.css";
import { useIdentity } from "../../hooks/use-identity";

const APPOINTMENTS = SECTIONS.slice(0, 4);
const SETTINGS = SECTIONS.slice(4);

interface AccountNavProps {
  current: string | null;
  accountName: string;
  initials: string;
  onGo: (id: string) => void;
  onLogOut: () => void;
}

const Avatar = ({
  className,
  initials,
}: {
  className?: string;
  initials: string;
}) => (
  <span className={className} aria-hidden="true">
    <AccountPhoto initials={initials} />
  </span>
);

const Chevron = () => (
  <span className={styles.chevron}>
    <ChevronRight className={styles.icon} size={18} strokeWidth={1.7} />
  </span>
);

const getGoTo =
  (onGo: (id: string) => void) => (id: string) => (event: MouseEvent) => {
    event.preventDefault();
    onGo(id);
  };

/** "Member since March 2024", from when the account was created. */
const useMemberSince = () => {
  const identity = useIdentity();

  if (!identity) return "";

  const since = new Date(identity.user.createdAt).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return `Member since ${since}`;
};

/** Wide screens: the sticky "Your account" side nav. */
export const AccountSideNav = ({
  current,
  accountName,
  initials,
  onGo,
  onLogOut,
}: AccountNavProps) => {
  const goTo = getGoTo(onGo);
  const memberSince = useMemberSince();

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
          <Avatar className={styles.sideAvatar} initials={initials} />
          <div className={styles.profileText}>
            <div className={styles.sideName}>{accountName}</div>
            <div className={styles.memberSince}>{memberSince}</div>
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
          <CircleQuestionMark
            className={styles.icon}
            size={18}
            strokeWidth={1.7}
          />
          Help & support
        </Link>
        <button className={styles.sideLogOut} onClick={onLogOut}>
          <LogOut className={styles.icon} size={18} strokeWidth={1.7} />
          Log out
        </button>
      </div>
    </nav>
  );
};

/** Narrow screens without a section: the list of sections. */
export const AccountMobileList = ({
  accountName,
  initials,
  onGo,
  onLogOut,
}: Omit<AccountNavProps, "current">) => {
  const goTo = getGoTo(onGo);
  const memberSince = useMemberSince();

  const renderRows = (sections: AccountSection[]) => (
    <div className={styles.list}>
      {sections.map(({ id, label, icon: ItemIcon, strokeWidth = 1.7 }) => (
        <Link
          key={id}
          className={styles.row}
          id={`ac-row-${id}`}
          to={`/account?section=${id}`}
          onClick={goTo(id)}
        >
          <ItemIcon
            className={styles.icon}
            size={20}
            strokeWidth={strokeWidth}
          />
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
        <Avatar className={styles.listAvatar} initials={initials} />
        <div className={styles.profileText}>
          <div className={styles.listName}>{accountName}</div>
          <div className={styles.memberSince}>{memberSince}</div>
        </div>
      </div>
      <h2 className={styles.listHeading}>Your account</h2>
      {renderRows(APPOINTMENTS)}
      <h2 className={styles.listHeadingNext}>Settings</h2>
      {renderRows(SETTINGS)}
      <div className={styles.listFoot}>
        <Link className={styles.footRow} to="/help">
          <CircleQuestionMark
            className={styles.icon}
            size={20}
            strokeWidth={1.7}
          />
          <span className={styles.footRowLabel}>Help & support</span>
          <Chevron />
        </Link>
        <button className={styles.footLogOut} onClick={onLogOut}>
          <LogOut className={styles.icon} size={20} strokeWidth={1.7} />
          <span className={styles.footRowLabel}>Log out</span>
        </button>
      </div>
    </div>
  );
};
