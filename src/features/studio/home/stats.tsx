import { asStyle } from "../../../utils/as-style";
import { joinClassNames } from "../../../utils/class-names";
import type { StudioController } from "../core/use-studio";
import { RangeSwitch } from "./range-switch";
import type { HomeView } from "./view";
import styles from "../../../styles/features/studio/home/stats.module.css";
import shared from "../../../styles/features/studio/home/index.module.css";

interface OverviewStatsProps {
  studio: StudioController;
  view: HomeView;
}

export const OverviewStats = ({ studio, view }: OverviewStatsProps) => (
  <section className={shared.side}>
    {!studio.isDesktop && (
      <div className={styles.sectionHead}>
        <h2 className={shared.h2}>Overview</h2>
        <RangeSwitch studio={studio} />
      </div>
    )}
    <div className={shared.stats}>
      {view.statCards.map(({ label, value, subtitle, delta, delay }) => (
        // runtime: staggered entry
        <div
          key={label}
          className={shared.stat}
          style={asStyle({ "--delay": delay })}
        >
          <div className={styles.statHead}>
            <div className={shared.muted}>{label}</div>
            {delta && (
              <div
                className={joinClassNames(
                  styles.delta,
                  delta.isDown && styles.deltaDown,
                )}
              >
                {delta.text}
              </div>
            )}
          </div>
          <div>
            <div className={styles.statValue}>{value}</div>
            {subtitle && <div className={styles.statSub}>{subtitle}</div>}
          </div>
        </div>
      ))}
    </div>
  </section>
);
