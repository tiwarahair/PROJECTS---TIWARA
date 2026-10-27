import type { CalendarAppLink } from "../../types/calendar";
import { joinClassNames } from "../../utils/class-names";
import { AppleLogo, GoogleLogo, OutlookLogo } from "../icons/brand-icons";
import styles from "../../styles/components/calendar-app-pills/index.module.css";

const LOGOS = {
  apple: <AppleLogo size={16} className={styles.appleLogo} />,
  google: <GoogleLogo size={16} />,
  outlook: <OutlookLogo size={16} />,
};

interface CalendarAppPillsProps {
  label: string;
  links: CalendarAppLink[];
  isCentered?: boolean;
}

/** apple, google & outlook calendar buttons, each with its logo. Apple opens in place; the others in a new tab. */
export const CalendarAppPills = ({
  label,
  links,
  isCentered = false,
}: CalendarAppPillsProps) => (
  <div className={joinClassNames(styles.apps, isCentered && styles.centered)}>
    <span className={styles.label}>{label}</span>
    <div className={styles.links}>
      {links.map(({ app, label: appLabel, href }) => (
        <a
          key={app}
          href={href}
          target={app === "apple" ? undefined : "_blank"}
          rel="noopener noreferrer"
          className={styles.app}
        >
          {LOGOS[app]}
          {appLabel}
        </a>
      ))}
    </div>
  </div>
);
