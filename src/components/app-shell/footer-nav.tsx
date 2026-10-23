import { joinClassNames } from "../../utils/class-names";
import type { AppShellNavItem } from "./types";
import styles from "../../styles/components/app-shell/footer-nav.module.css";

interface AppShellFooterNavProps {
  label: string;
  items: AppShellNavItem[];
}

/** The bottom bar on phones. */
export const AppShellFooterNav = ({ label, items }: AppShellFooterNavProps) => (
  <nav className={styles.footerNav} aria-label={label}>
    {items.map(
      ({ id, label: itemLabel, icon: NavIcon, isOn, onSelect, badge }) => (
        <button
          key={id}
          className={joinClassNames(
            styles.footerButton,
            isOn && styles.footerOn,
          )}
          onClick={onSelect}
          aria-current={isOn ? "page" : undefined}
        >
          <span
            className={joinClassNames(styles.footerPill, styles.pillAnchor)}
          >
            <NavIcon size={19} strokeWidth={1.8} />
            {!!badge && (
              <span
                className={styles.footerBadge}
                aria-label={`${badge} waiting`}
              >
                {badge}
              </span>
            )}
          </span>
          <span className={styles.footerLabel}>{itemLabel}</span>
        </button>
      ),
    )}
  </nav>
);
