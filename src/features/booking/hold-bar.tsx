import { joinClassNames } from "../../utils/class-names";
import helmet from "./booking-helmet.module.css";
import styles from "./hold-bar.module.css";

interface HoldBarProps {
  /** "nav": under the nav, mobile only · "card": inside the summary card. */
  variant: "nav" | "card";
  time: string | null;
  leftMs: number;
}

/** "We're holding 10:30 for you · 9:59" — turns amber under 2 minutes. */
export const HoldBar = ({ variant, time, leftMs }: HoldBarProps) => {
  const minutes = Math.floor(leftMs / 60000);
  const seconds = Math.floor(leftMs / 1000) % 60;
  const isNav = variant === "nav";
  return (
    <div
      data-screen-label={isNav ? "Slot hold bar" : "Slot hold"}
      role="timer"
      aria-label={
        "Holding " +
        time +
        " for you, " +
        minutes +
        " minutes " +
        seconds +
        " seconds left"
      }
      className={joinClassNames(
        isNav && helmet.holdmob,
        isNav ? styles.barMobile : styles.barCard,
        styles.tone,
        leftMs < 120000 && styles.toneAmber,
      )}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className={styles.icon}
      >
        <circle cx="12" cy="12" r="9"></circle>
        <path d="M12 7v5l3 2"></path>
      </svg>
      <span>
        {"We're holding " + time + " for you · "}
        <span className={styles.countdown}>
          {minutes + ":" + String(seconds).padStart(2, "0")}
        </span>
      </span>
    </div>
  );
};
