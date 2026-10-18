import { Link } from "react-router";
import { Eye, Link2, LogOut } from "lucide-react";
import { joinClassNames } from "../../../utils/class-names";
import { GATE_REASON } from "../core/constants";
import { getProfilePath } from "../core/model";
import type { StudioController } from "../core/use-studio";
import type { SettingsView } from "./view";
import shared from "../../../styles/features/studio/settings/index.module.css";
import styles from "../../../styles/features/studio/settings/nav.module.css";

const LOCKED_SHARES = [
  {
    key: "link",
    label: "Copy booking link",
    icon: <Link2 size={15} strokeWidth={1.8} />,
  },
  {
    key: "profile",
    label: "View public profile",
    icon: <Eye size={15} strokeWidth={1.8} />,
  },
];

export interface SettingsNavProps {
  studio: StudioController;
  view: SettingsView;
}

export const SettingsNav = ({ studio, view }: SettingsNavProps) => {
  const { state, setState } = studio;

  const showTip = () => {
    if (!studio.context.getState().shareTip) setState({ shareTip: true });
  };

  const hideTip = () => {
    if (studio.context.getState().shareTip) setState({ shareTip: false });
  };

  return (
    <aside
      className={joinClassNames(
        styles.nav,
        view.isNavDesktop && styles.navDesk,
      )}
      data-screen-label="Settings nav"
    >
      <div className={styles.navTitle}>Settings</div>
      {view.navGroups.map(({ key, label, isFirst, items }) => (
        <div
          key={key}
          className={joinClassNames(
            styles.navGroup,
            isFirst && styles.navGroupFirst,
          )}
        >
          <div className={styles.navGroupLabel}>{label}</div>
          <div className={styles.navList}>
            {items.map(
              ({
                key: itemKey,
                label: itemLabel,
                icon: ItemIcon,
                isCurrent,
                onSelect,
              }) => (
                <button
                  key={itemKey}
                  className={joinClassNames(
                    styles.navItem,
                    isCurrent && styles.navItemOn,
                  )}
                  onClick={onSelect}
                >
                  <span className={styles.navIcon}>
                    <ItemIcon size={16} strokeWidth={1.7} />
                  </span>
                  <span className={styles.navLabel}>{itemLabel}</span>
                </button>
              ),
            )}
          </div>
        </div>
      ))}
      <div className={styles.share}>
        <div className={styles.shareLabel}>Share</div>
        <div
          className={styles.shareStack}
          onMouseEnter={showTip}
          onMouseLeave={hideTip}
        >
          {view.isShareLive && (
            <>
              <button className={styles.shareButton} onClick={view.copyLink}>
                <Link2 size={15} strokeWidth={1.8} />
                Copy booking link
              </button>
              <Link className={styles.shareLink} to={getProfilePath(state)}>
                <Eye size={15} strokeWidth={1.8} />
                View public profile
              </Link>
            </>
          )}
          {!view.isShareLive && (
            <>
              {state.shareTip && (
                <div className={styles.shareTip} role="tooltip" id="share-tip">
                  {GATE_REASON}
                </div>
              )}
              {LOCKED_SHARES.map(({ key, label, icon }) => (
                <button
                  key={key}
                  className={styles.shareLocked}
                  aria-disabled="true"
                  aria-describedby="share-tip"
                  onFocus={showTip}
                  onBlur={hideTip}
                  onClick={() => setState({ shareTip: !state.shareTip })}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </>
          )}
        </div>
        <button className={styles.navSignOut} onClick={view.signOut}>
          <LogOut className={shared.noShrink} size={16} strokeWidth={1.7} />
          Sign out
        </button>
      </div>
    </aside>
  );
};
