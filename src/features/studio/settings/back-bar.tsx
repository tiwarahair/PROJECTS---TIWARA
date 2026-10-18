import { ChevronLeft } from "lucide-react";
import { joinClassNames } from "../../../utils/class-names";
import type { StudioController } from "../core/use-studio";
import { SaveButtons } from "./save-buttons";
import type { SettingsView } from "./view";
import styles from "../../../styles/features/studio/settings/back-bar.module.css";

export interface BackBarProps {
  studio: StudioController;
  view: SettingsView;
}

export const BackBar = ({ studio, view }: BackBarProps) => {
  const { state, actions } = studio;

  const hostSaves = [
    {
      key: "policy",
      isShown: view.isPolicy,
      isOn: !!state.policyCanSave,
      onClick: view.savePolicyHeader,
    },
    {
      key: "account",
      isShown: view.hasAccountSave,
      isOn: !!state.accountCanSave,
      onClick: view.saveAccountHeader,
    },
    {
      key: "business",
      isShown: view.isBusiness,
      isOn: !!state.businessCanSave,
      onClick: view.saveBusinessHeader,
    },
  ];

  return (
    <div className={styles.backBar}>
      <div className={styles.backRow}>
        <button className={styles.backButton} onClick={actions.closePage}>
          <ChevronLeft size={18} strokeWidth={2} />
          Settings
        </button>
        <div className={styles.spacer}></div>
        <SaveButtons view={view} className={styles.save} label="Save" />
        {hostSaves
          .filter(({ isShown }) => isShown)
          .map(({ key, isOn, onClick }) => (
            <button
              key={key}
              className={joinClassNames(
                styles.hostSave,
                isOn && styles.hostSaveOn,
              )}
              onClick={onClick}
              disabled={!isOn}
            >
              Save
            </button>
          ))}
      </div>
    </div>
  );
};
