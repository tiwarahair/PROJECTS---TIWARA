import { Check, ChevronRight } from "lucide-react";
import { asStyle } from "../../../utils/as-style";
import { joinClassNames } from "../../../utils/class-names";
import { getSetupProgress, getSetupRows } from "../shell";
import type { StudioController } from "../core/use-studio";
import styles from "../../../styles/features/studio/home/setup-banner.module.css";

interface SetupBannerProps {
  studio: StudioController;
}

export const SetupBanner = ({ studio }: SetupBannerProps) => {
  const { steps, doneCount } = getSetupProgress(studio);

  // runtime: the share of setup steps done
  const barStyle = asStyle({
    "--setup-pct": `${((doneCount / 4) * 100).toFixed(0)}%`,
  });

  return (
    <section className={styles.setup}>
      <div className={styles.setupHead}>
        <div className={styles.setupTitle}>Set up your studio</div>
        <div className={styles.setupCount}>{`${doneCount} of 4 done`}</div>
      </div>
      <div className={styles.setupSub}>
        Four steps and clients can book you.
      </div>
      <div className={styles.setupTrack}>
        <div className={styles.setupBar} style={barStyle}></div>
      </div>
      <div className={styles.column}>
        {getSetupRows(studio).map(([key, label, subtitle, onSelect]) => {
          const isDone = !!steps[key];

          return (
            <button key={key} className={styles.setupRow} onClick={onSelect}>
              <span
                className={joinClassNames(
                  styles.setupTick,
                  isDone && styles.setupTickDone,
                )}
              >
                {isDone && (
                  <Check size={11} strokeWidth={3.2} color="#1a1714" />
                )}
              </span>
              <span
                className={joinClassNames(
                  styles.setupText,
                  isDone && styles.setupTextDone,
                )}
              >
                <span className={styles.setupLabel}>{label}</span>
                <span className={styles.setupRowSub}>{subtitle}</span>
              </span>
              <ChevronRight
                size={15}
                strokeWidth={1.7}
                color="rgba(246,240,228,.55)"
              />
            </button>
          );
        })}
      </div>
    </section>
  );
};
