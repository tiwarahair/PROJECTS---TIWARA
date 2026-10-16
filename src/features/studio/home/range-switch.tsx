import { joinClassNames } from "../../../utils/class-names";
import type { StudioController } from "../core/use-studio";
import styles from "../../../styles/features/studio/home/range-switch.module.css";

const RANGES = [
  { id: "today", label: "Today" },
  { id: "week", label: "7 days" },
  { id: "month", label: "30 days" },
] as const;

interface RangeSwitchProps {
  studio: StudioController;
}

export const RangeSwitch = ({ studio }: RangeSwitchProps) => (
  <div className={styles.ranges}>
    {RANGES.map(({ id, label }) => (
      <button
        key={id}
        className={joinClassNames(
          styles.range,
          studio.state.range === id && styles.rangeOn,
        )}
        onClick={() => studio.setState({ range: id, chartIndex: null })}
      >
        {label}
      </button>
    ))}
  </div>
);
