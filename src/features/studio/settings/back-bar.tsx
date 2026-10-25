import { BackBar } from "../../../components/back-bar";
import { joinClassNames } from "../../../utils/class-names";
import type { StudioController } from "../core/use-studio";
import { SaveButtons } from "./save-buttons";
import type { SettingsView } from "./view";
import styles from "../../../styles/features/studio/settings/back-bar.module.css";

export interface SettingsBackBarProps {
  studio: StudioController;
  view: SettingsView;
}

export const SettingsBackBar = ({ studio, view }: SettingsBackBarProps) => {
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
    <BackBar back={{ label: "Settings", onClick: actions.closePage }}>
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
    </BackBar>
  );
};
