import { Clock } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import pageGlobal from "../../styles/features/booking/booking-page-global.module.css";
import styles from "../../styles/features/booking/hold-bar.module.css";

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
      aria-label={`Holding ${time} for you, ${minutes} minutes ${seconds} seconds left`}
      className={joinClassNames(
        isNav && pageGlobal.holdmob,
        isNav ? styles.barMobile : styles.barCard,
        styles.tone,
        leftMs < 120000 && styles.toneAmber,
      )}
    >
      <Clock size={15} strokeWidth={1.5} className={styles.icon} />
      <span>
        {`We're holding ${time} for you · `}
        <span className={styles.countdown}>
          {`${minutes}:${String(seconds).padStart(2, "0")}`}
        </span>
      </span>
    </div>
  );
};
