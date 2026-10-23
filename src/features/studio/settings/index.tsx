import { useNavigate } from "react-router";
import { joinClassNames } from "../../../utils/class-names";
import { SettingsBackBar } from "./back-bar";
import { SettingsNav } from "./nav";
import { SettingsPage } from "./page";
import { SettingsRoot } from "./root";
import { getSettingsView } from "./view";
import type { SettingsView } from "./view";
import type { StudioController } from "../core/use-studio";
import styles from "../../../styles/features/studio/settings/index.module.css";
import { useAccountBackend } from "./use-account-backend";
import { useSignOut } from "../../../hooks/use-sign-out";
import { useAppSelector } from "../../../stores/hooks";

interface SettingsFrameProps {
  studio: StudioController;
  view: SettingsView;
}

/** One settings page with the wide nav or the narrow back bar. */
const SettingsFrame = ({ studio, view }: SettingsFrameProps) => {
  const { isWide, isDesktop } = studio;
  const account = useAccountBackend(studio);

  return (
    <div
      className={joinClassNames(
        styles.frame,
        isWide && (isDesktop ? styles.frameDesk : styles.frameWide),
      )}
      data-screen-label="Settings"
    >
      {isWide && <SettingsNav studio={studio} view={view} />}
      <div className={styles.content}>
        {!isWide && <SettingsBackBar studio={studio} view={view} />}
        <div
          className={joinClassNames(
            styles.pagePad,
            isDesktop ? styles.pagePadDesk : isWide && styles.pagePadWide,
          )}
        >
          <SettingsPage studio={studio} view={view} account={account} />
        </div>
      </div>
    </div>
  );
};

/** Studio → Settings: the narrow root menu or a settings page. */
export const StudioSettings = ({ studio }: { studio: StudioController }) => {
  const navigate = useNavigate();
  const signOut = useSignOut();
  const isAdmin = useAppSelector(({ session }) => !!session.user?.isAdmin);
  const view = getSettingsView(studio, navigate, signOut, isAdmin);

  return (
    <>
      {view.isRootMobile && <SettingsRoot studio={studio} view={view} />}
      {view.isPage && <SettingsFrame studio={studio} view={view} />}
    </>
  );
};
