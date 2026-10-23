import type { ReactNode } from "react";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/app-shell/top-bar.module.css";

interface AppShellTopBarProps {
  title: string;
  note: string;
  isWide: boolean;
  isDesktop: boolean;
  isHidden?: boolean;
  /** before the title, e.g. Studio's avatar on phones */
  leading?: ReactNode;
  /** after the title, e.g. Studio's bell and New booking */
  children?: ReactNode;
}

/** The main card's top bar: the page title and a note line, with room for actions. */
export const AppShellTopBar = ({
  title,
  note,
  isWide,
  isDesktop,
  isHidden = false,
  leading,
  children,
}: AppShellTopBarProps) => (
  <div
    className={joinClassNames(
      styles.topBar,
      isDesktop ? styles.topBarDesk : isWide && styles.topBarWide,
      isHidden && styles.topBarHidden,
    )}
    data-screen-label="Top bar"
  >
    {leading}
    <div className={styles.grow}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.dateLine}>{note}</div>
    </div>
    {children}
  </div>
);
