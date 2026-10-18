import { PanelLeft } from "lucide-react";
import { Avatar } from "../../../components/ds/avatar";
import { getAssetUrl } from "../../../utils/asset-url";
import { joinClassNames } from "../../../utils/class-names";
import type { StudioController } from "../core/use-studio";
import shared from "../../../styles/features/studio/shell/index.module.css";
import styles from "../../../styles/features/studio/shell/sidebar.module.css";
import { getNavItems } from "./nav-items";

export const StudioSidebar = ({ studio }: { studio: StudioController }) => {
  const { state, isDesktop, setState } = studio;
  const isOpen = state.sidebarOpen ?? isDesktop;

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
          <img
            className={styles.logo}
            src={getAssetUrl("logos/logo-crimson-sm.png")}
            alt="Tiwára's House"
          />
        )}
        <button
          className={joinClassNames(
            styles.toggle,
            isOpen ? styles.toggleOpen : styles.toggleClosed,
          )}
          onClick={() => setState({ sidebarOpen: !isOpen })}
          aria-label="Toggle sidebar"
        >
          <PanelLeft size={18} strokeWidth={1.8} />
        </button>
      </div>
      <nav className={styles.nav}>
        {getNavItems(studio).map(
          ({ id, label, icon: NavItemIcon, isOn, onSelect }) => (
            <button
              key={id}
              className={joinClassNames(
                styles.navButton,
                isOpen ? styles.navOpen : styles.navClosed,
                isOn ? styles.navOn : styles.navOff,
              )}
              onClick={onSelect}
              title={label}
            >
              <span className={styles.navIcon}>
                <NavItemIcon size={19} strokeWidth={1.8} />
              </span>
              {isOpen && <span className={styles.navLabel}>{label}</span>}
            </button>
          ),
        )}
      </nav>
      <div className={styles.spacer}></div>
      <button
        className={joinClassNames(
          styles.profileButton,
          isOpen ? styles.profileOpen : styles.profileClosed,
        )}
        onClick={() => setState({ tab: "settings", page: null })}
        title="Profile"
      >
        <Avatar
          className={styles.profileAvatar}
          src={state.avatarUrl ?? undefined}
          name={state.owner.name}
          size={32}
          isDecorative
        />
        {isOpen && (
          <span className={shared.grow}>
            <span className={styles.profileName}>{state.owner.first}</span>
            <span className={styles.profileArea}>{state.owner.area}</span>
          </span>
        )}
      </button>
    </aside>
  );
};
