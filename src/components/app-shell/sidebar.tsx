import { PanelLeft } from "lucide-react";
import { Link } from "react-router";
import { Avatar } from "../ds/avatar";
import { SiteMenu } from "../site-menu";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import type { AppShellLink, AppShellNavItem } from "./types";
import styles from "../../styles/components/app-shell/sidebar.module.css";

interface AppShellProfile {
  name: string;
  /** the full name, for the avatar's initials when the chip shows only a first name */
  fullName?: string;
  area: string;
  avatarUrl?: string;
  onClick?: () => void;
}

interface AppShellSidebarProps {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  items: AppShellNavItem[];
  links?: AppShellLink[];
  profile: AppShellProfile;
}

/** The sidebar on wider screens: logo, the page's nav, links elsewhere and the profile chip. */
export const AppShellSidebar = ({
  label,
  isOpen,
  onToggle,
  items,
  links = [],
  hasLinksDivider = false,
  profile,
}: AppShellSidebarProps) => {
  const getNavClass = (isOn: boolean) =>
    joinClassNames(
      styles.navButton,
      isOpen ? styles.navOpen : styles.navClosed,
      isOn ? styles.navOn : styles.navOff,
    );

  const profileClass = joinClassNames(
    styles.profileButton,
    isOpen ? styles.profileOpen : styles.profileClosed,
  );

  const profileContent = (
    <>
      <Avatar
        className={styles.profileAvatar}
        src={profile.avatarUrl}
        name={profile.fullName ?? profile.name}
        size={32}
        isDecorative
      />
      {isOpen && (
        <span className={styles.grow}>
          <span className={styles.profileName}>{profile.name}</span>
          <span className={styles.profileArea}>{profile.area}</span>
        </span>
      )}
    </>
  );

  return (
    <aside
      className={joinClassNames(
        styles.sidebar,
        isOpen ? styles.sidebarOpen : styles.sidebarClosed,
      )}
      data-screen-label="Sidebar"
    >
      <div className={styles.logoRow}>
        {isOpen && (
          <Link to="/" aria-label="Tiwára's House home">
            <img
              className={styles.logo}
              src={getAssetUrl("logos/logo-crimson-sm.png")}
              alt=""
            />
          </Link>
        )}
        <button
          className={joinClassNames(
            styles.toggle,
            isOpen ? styles.toggleOpen : styles.toggleClosed,
          )}
          onClick={onToggle}
          aria-label="Toggle sidebar"
        >
          <PanelLeft size={18} strokeWidth={1.8} />
        </button>
      </div>
      <nav className={styles.nav} aria-label={label}>
        {items.map(
          ({ id, label: itemLabel, icon: NavIcon, isOn, onSelect, badge }) => (
            <button
              key={id}
              className={getNavClass(isOn)}
              onClick={onSelect}
              aria-current={isOn ? "page" : undefined}
              title={itemLabel}
            >
              <span className={styles.navIcon}>
                <NavIcon size={19} strokeWidth={1.8} />
              </span>
              {isOpen && <span className={styles.navLabel}>{itemLabel}</span>}
              {!!badge && (
                <span
                  className={joinClassNames(
                    styles.badge,
                    !isOpen && styles.badgeDot,
                  )}
                  aria-label={`${badge} waiting`}
                >
                  {isOpen ? badge : ""}
                </span>
              )}
            </button>
          ),
        )}
        {hasLinksDivider && !!links.length && (
          <div className={styles.navDivider}></div>
        )}
        {links.map(({ to, label: linkLabel, icon: LinkIcon }) => (
          <Link
            key={to}
            className={getNavClass(false)}
            to={to}
            title={linkLabel}
          >
            <span className={styles.navIcon}>
              <LinkIcon size={19} strokeWidth={1.8} />
            </span>
            {isOpen && <span className={styles.navLabel}>{linkLabel}</span>}
          </Link>
        ))}
      </nav>
      <div className={styles.spacer}></div>
      {profile.onClick ? (
        <button
          className={profileClass}
          onClick={profile.onClick}
          title="Profile"
        >
          {profileContent}
        </button>
      ) : (
        <SiteMenu isSignedIn className={profileClass}>
          {profileContent}
        </SiteMenu>
      )}
    </aside>
  );
};
