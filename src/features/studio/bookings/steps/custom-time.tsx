import type { ChangeEvent } from "react";
import { joinClassNames } from "../../../../utils/class-names";
import styles from "../../../../styles/features/studio/bookings/steps/custom-time.module.css";
import shared from "../../../../styles/features/studio/bookings/steps/index.module.css";

interface CustomTimeProps {
  hint: string;
  isWarn: boolean;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  min?: string;
  max?: string;
}

export const CustomTime = ({
  hint,
  isWarn,
  value,
  onChange,
  min,
  max,
}: CustomTimeProps) => (
  <div className={styles.customRow}>
    <div className={shared.grow}>
      <div className={shared.label145}>Start time</div>
      <div
        className={joinClassNames(
          styles.customHint,
          isWarn && styles.customHintWarn,
        )}
      >
        {hint}
      </div>
    </div>
    <input
      className={styles.timeInput}
      type="time"
      step="300"
      min={min}
      max={max}
      value={value}
      onChange={onChange}
      aria-label="Custom start time"
    />
  </div>
);
