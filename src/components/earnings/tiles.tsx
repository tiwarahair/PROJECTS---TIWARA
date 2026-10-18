import { joinClassNames } from "../../utils/class-names";
import { getStats } from "./logic";
import type { EarningsController } from "./use-earnings";
import styles from "../../styles/components/earnings/tiles.module.css";
import { formatMoney } from "../../utils/money";

interface TilesProps {
  earnings: EarningsController;
}

export const Tiles = ({
  earnings: { ledger, range, isDesktop },
}: TilesProps) => {
  const stats = getStats(
    ledger.transactions.filter(({ at }) => at >= range.start && at < range.end),
  );

  const tiles = [
    {
      key: "t",
      label: "Takings",
      value: stats.takings,
      className: styles.tileValueNormal,
    },
    {
      key: "f",
      label: "Card fees",
      value: -stats.fees,
      className: styles.tileValueNormal,
    },
    {
      key: "r",
      label: "Refunds",
      value: stats.refunds,
      className:
        stats.refunds < 0 ? styles.tileValueNegative : styles.tileValueNormal,
    },
    {
      key: "n",
      label: "Net",
      value: stats.net,
      className: styles.tileValueNet,
    },
  ];

  return (
    <div
      className={joinClassNames(
        styles.tiles,
        isDesktop ? styles.tilesDesk : styles.tilesMobile,
      )}
    >
      {tiles.map(({ key, label, value, className }) => (
        <div key={key} className={styles.tile}>
          <div className={styles.tileLabel}>{label}</div>
          <div className={joinClassNames(styles.tileValue, className)}>
            {formatMoney(value, { pence: "always" })}
          </div>
        </div>
      ))}
    </div>
  );
};
