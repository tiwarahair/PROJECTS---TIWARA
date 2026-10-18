import { Fragment } from "react";
import { LogOut, Pencil, Truck } from "lucide-react";
import { Avatar } from "../../../components/ds/avatar";
import { getAssetUrl } from "../../../utils/asset-url";
import { joinClassNames } from "../../../utils/class-names";
import type { SettingsView } from "./view";
import type { StudioController } from "../core/use-studio";
import shared from "../../../styles/features/studio/settings/index.module.css";
import styles from "../../../styles/features/studio/settings/root.module.css";

export interface SettingsRootProps {
  studio: StudioController;
  view: SettingsView;
}

/** The narrow "More" tab: profile card and grouped settings rows. */
export const SettingsRoot = ({ studio, view }: SettingsRootProps) => {
  const { state, actions } = studio;

  return (
    <div className={styles.root} data-screen-label="Settings">
      <div className={styles.profileCard}>
        <Avatar
          src={state.avatarUrl ?? undefined}
          name={state.owner.name}
          size={54}
        />
        <div className={styles.grow}>
          <div className={styles.salonRow}>
            <span className={styles.salon}>{state.profile.salon}</span>
            {state.profile.mobile && (
              <span className={styles.mobileBadge}>
                <Truck size={11} strokeWidth={1.8} />
                Mobile
              </span>
            )}
          </div>
          <div className={styles.addr}>{state.profile.address}</div>
        </div>
        <button
          className={styles.editProfile}
          onClick={() => actions.openSubpage("profile")}
        >
          <Pencil size={13} strokeWidth={1.7} />
          Edit
        </button>
      </div>
      {view.rootGroups.map(({ key, label, rows }) => (
        <Fragment key={key}>
          <div className={styles.groupLabel}>{label}</div>
          <div className={styles.group}>
            {rows.map(
              ({
                key: rowKey,
                label: rowLabel,
                subtitle,
                icon: RowIcon,
                isLocked,
                onSelect,
              }) => (
                <button
                  key={rowKey}
                  className={joinClassNames(
                    styles.row,
                    isLocked && styles.rowLocked,
                  )}
                  onClick={onSelect}
                  aria-disabled={isLocked ? "true" : "false"}
                >
                  <span className={styles.rowIcon}>
                    <RowIcon
                      className={styles.blockIcon}
                      size={18}
                      strokeWidth={1.8}
                    />
                  </span>
                  <span className={styles.grow}>
                    <span className={styles.rowLabel}>{rowLabel}</span>
                    <span className={styles.rowSub}>{subtitle}</span>
                  </span>
                </button>
              ),
            )}
          </div>
        </Fragment>
      ))}
      <button className={styles.signOut} onClick={view.signOut}>
        <LogOut className={shared.noShrink} size={16} strokeWidth={1.7} />
        Sign out
      </button>
      <div className={styles.logoRow}>
        <img
          className={styles.logo}
          src={getAssetUrl("logos/logo-crimson-sm.png")}
          alt="Tiwára's House"
        />
      </div>
    </div>
  );
};
