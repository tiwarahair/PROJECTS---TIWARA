import { joinClassNames } from "../../../utils/class-names";
import type { StudioController } from "../core/use-studio";
import styles from "../../../styles/features/studio/shell/footer-nav.module.css";
import { getNavItems } from "./nav-items";

export const FooterNav = ({ studio }: { studio: StudioController }) => (
  <nav className={styles.footerNav}>
    {getNavItems(studio).map(
      ({ id, label, icon: NavItemIcon, isOn, onSelect }) => (
        <button
          key={id}
          className={joinClassNames(
            styles.footerButton,
            isOn && styles.footerOn,
          )}
          onClick={onSelect}
        >
          <span className={styles.footerPill}>
            <NavItemIcon size={19} strokeWidth={1.8} />
          </span>
          <span className={styles.footerLabel}>{label}</span>
        </button>
      ),
    )}
  </nav>
);
