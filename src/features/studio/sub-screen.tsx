import { useNavigate } from "react-router";
import { joinClassNames } from "../../utils/class-names";
import { getSettingsView } from "./settings-view";
import { getOverlayAnimation, getPanelPlacement } from "./studio-overlay";
import type { StudioController } from "./use-studio";
import overlay from "./studio-overlay.module.css";
import styles from "./sub-screen.module.css";

const TITLES: Record<string, string> = {
  business: "Business details",
  availability: "Availability",
  policy: "Payment policy",
  rules: "Booking rules",
  profile: "Edit profile",
};

/** The settings sub-screen shell (prototype subOpen). Its body is empty in the prototype. */
export const SubScreen = ({ studio }: { studio: StudioController }) => {
  const navigate = useNavigate();
  const { state, isWide, actions } = studio;
  if (!state.sub) return null;
  const settings = getSettingsView(studio, navigate);
  const save =
    state.sub === "availability"
      ? settings.saveAvail
      : state.sub === "profile"
        ? settings.saveProfile
        : state.sub === "rules"
          ? settings.saveRules
          : null;
  return (
    <>
      {isWide && (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div className={styles.scrim} onClick={actions.closeSub}></div>
      )}
      <div
        className={joinClassNames(
          styles.panel,
          getPanelPlacement(isWide),
          isWide
            ? joinClassNames(
                styles.panelWide,
                getOverlayAnimation(state.subOut, "side", true),
              )
            : state.subOut
              ? overlay.subOut
              : overlay.subIn,
        )}
      >
        <div className={styles.bar}>
          <button
            className={styles.back}
            onClick={actions.closeSub}
            aria-label="Back"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6"></path>
            </svg>
          </button>
          <div className={styles.title}>{TITLES[state.sub] ?? ""}</div>
          {save && (
            <button className={styles.save} onClick={save}>
              Save
            </button>
          )}
        </div>
      </div>
    </>
  );
};
