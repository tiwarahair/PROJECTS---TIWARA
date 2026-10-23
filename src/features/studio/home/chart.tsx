import { asStyle } from "../../../utils/as-style";
import { formatMoney } from "../../../utils/money";
import type { StudioController } from "../core/use-studio";
import { RangeSwitch } from "./range-switch";
import type { HomeView } from "./view";
import styles from "../../../styles/features/studio/home/chart.module.css";
import shared from "../../../styles/features/studio/home/index.module.css";

interface RevenueChartProps {
  studio: StudioController;
  view: HomeView;
}

const ChartPlot = ({ studio, view }: RevenueChartProps) => {
  const { chart, tipPoint, rangeData } = view;
  const { chartIndex } = studio.state;

  return (
    <>
      <div
        className={styles.chart}
        onPointerMove={view.onChartMove}
        onPointerLeave={() => studio.setState({ chartIndex: null })}
        onPointerDown={view.onChartMove}
      >
        <svg className={styles.chartSvg} viewBox="0 0 340 120">
          <defs>
            <linearGradient id="revg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(143,17,18,.22)"></stop>
              <stop offset="100%" stopColor="rgba(143,17,18,0)"></stop>
            </linearGradient>
          </defs>
          <line
            x1="8"
            y1="112"
            x2="332"
            y2="112"
            stroke="var(--border-subtle)"
            strokeWidth="1"
          ></line>
          <path d={chart.area} fill="url(#revg)"></path>
          <path
            d={chart.line}
            fill="none"
            stroke="var(--accent-700)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
          {tipPoint && (
            <>
              <line
                x1={tipPoint.x.toFixed(1)}
                y1="14"
                x2={tipPoint.x.toFixed(1)}
                y2="112"
                stroke="var(--accent-line)"
                strokeWidth="1"
              ></line>
              <circle
                cx={tipPoint.x.toFixed(1)}
                cy={tipPoint.y.toFixed(1)}
                r="4.5"
                fill="var(--accent-700)"
                stroke="#fff"
                strokeWidth="2"
              ></circle>
            </>
          )}
        </svg>
        {tipPoint && chartIndex != null && (
          <div
            className={styles.chartTip}
            // runtime: over the hovered point
            style={asStyle({
              "--tip-left": `${((tipPoint.x / 340) * 100).toFixed(1)}%`,
            })}
          >
            {`${rangeData.tips[chartIndex]} · ${formatMoney(tipPoint.value)}`}
          </div>
        )}
      </div>
      <div className={styles.chartLabels}>
        {rangeData.labels.map((label, index) => (
          <span key={index} className={styles.chartLabel}>
            {label}
          </span>
        ))}
      </div>
    </>
  );
};

export const RevenueChart = ({ studio, view }: RevenueChartProps) => (
  <section className={shared.chartSection}>
    <div className={styles.panel}>
      <div className={styles.chartHead}>
        <div>
          <div className={styles.chartTitle}>Revenue</div>
          <div className={shared.muted}>{view.rangeData.caption}</div>
        </div>
        {studio.isDesktop && <RangeSwitch studio={studio} />}
      </div>
      {view.isChartEmpty && (
        <div className={styles.chartEmpty}>
          <div className={shared.emptyTitle}>{view.chartEmptyTitle}</div>
          <div className={styles.emptyBody}>{view.chartEmptyBody}</div>
        </div>
      )}
      {view.hasChart && <ChartPlot studio={studio} view={view} />}
    </div>
  </section>
);
