import { useLayoutEffect } from "react";
import type { ReactNode } from "react";
import { joinClassNames } from "../../utils/class-names";
import "../../styles/features/studio/global.module.css";
import styles from "../../styles/components/app-shell/index.module.css";

export { AppShellFooterNav } from "./footer-nav";
export { AppShellSidebar } from "./sidebar";
export { AppShellTopBar } from "./top-bar";
export type { AppShellLink, AppShellNavItem } from "./types";

interface AppShellProps {
  label: string;
  isWide: boolean;
  sidebar: ReactNode;
  topBar: ReactNode;
  footerNav: ReactNode;
  bodyId: string;
  isBodyLocked?: boolean;
  children: ReactNode;
  overlays?: ReactNode;
}

/** Studio's frame, shared with Admin: a sidebar beside the main card on wider screens, a bottom bar on phones. */
export const AppShell = ({
  label,
  isWide,
  sidebar,
  topBar,
  footerNav,
  bodyId,
  isBodyLocked = false,
  children,
  overlays,
}: AppShellProps) => {
  useLayoutEffect(() => {
    document.documentElement.classList.add("studio-page");

    return () => document.documentElement.classList.remove("studio-page");
  }, []);

  return (
    <div className={styles.studio} data-screen-label={label}>
      <div className={joinClassNames(styles.frame, isWide && styles.frameWide)}>
        {isWide && sidebar}
        <div
          className={joinClassNames(
            styles.mainCard,
            isWide && styles.mainCardWide,
          )}
          data-screen-label="Main card"
        >
          {topBar}
          <div
            className={joinClassNames(
              styles.body,
              isBodyLocked && styles.bodyLocked,
            )}
            id={bodyId}
          >
            {children}
          </div>
          {!isWide && footerNav}
          {overlays}
        </div>
      </div>
    </div>
  );
};
