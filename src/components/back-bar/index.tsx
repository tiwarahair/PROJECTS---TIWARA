import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import styles from "../../styles/components/back-bar/index.module.css";

interface BackBarBack {
  label: string;
  to?: string;
  onClick?: () => void;
}

interface BackBarProps {
  back?: BackBarBack;
  /** shown instead of a back link */
  leading?: ReactNode;
  screenLabel?: string;
  children?: ReactNode;
}

export const BackBar = ({
  back,
  leading,
  screenLabel,
  children,
}: BackBarProps) => {
  const backContent = back && (
    <>
      <ChevronLeft size={18} strokeWidth={2} />
      {back.label}
    </>
  );

  return (
    <div className={styles.backBar} data-screen-label={screenLabel}>
      <div className={styles.backRow}>
        {back?.to && (
          <Link className={styles.backButton} to={back.to}>
            {backContent}
          </Link>
        )}
        {back && !back.to && (
          <button className={styles.backButton} onClick={back.onClick}>
            {backContent}
          </button>
        )}
        {!back && leading}
        <div className={styles.spacer}></div>
        {children}
      </div>
    </div>
  );
};
