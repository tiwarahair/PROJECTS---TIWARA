import { Lock, TriangleAlert } from "lucide-react";
import type { EarningsController, EarningsProps } from "./use-earnings";
import styles from "../../styles/components/earnings/balance.module.css";
import { formatMoney } from "../../utils/money";
import { formatWeekdayDate } from "../../utils/dates";

interface BalanceProps {
  earnings: EarningsController;
  props: EarningsProps;
}

export const Balance = ({
  earnings: { ledger, showToast },
  props: { taxHold, onLearnMore, onAddTax, onContinueSetup },
}: BalanceProps) => {
  const { scenario } = ledger;
  const pausedText = formatMoney(ledger.pausedAmount, { pence: "always" });
  const availableText = formatMoney(ledger.available, { pence: "always" });

  const nextPayoutDay = ledger.nextDate
    ? formatWeekdayDate(ledger.nextDate)
    : "";

  const onHoldText = formatMoney(ledger.onHold, { pence: "always" });

  const getHandler = (handler: (() => void) | undefined, message: string) =>
    handler ? () => handler() : () => showToast(message);

  return (
    <div className={styles.balance}>
      {scenario === "paused" && (
        <div className={styles.pausedBanner}>
          <TriangleAlert
            className={styles.bannerIcon}
            size={18}
            color="var(--brand-yellow)"
            strokeWidth={1.7}
          />
          <div className={styles.pausedText}>
            {`Payouts paused — ${pausedText} being recovered from a refund or dispute`}
          </div>
          <button
            className={styles.learnMore}
            onClick={getHandler(
              onLearnMore,
              "Opening the help article on payouts",
            )}
          >
            Learn more
          </button>
        </div>
      )}
      <div className={styles.availableLabel}>Available</div>
      <div className={styles.availableAmount}>{availableText}</div>
      {!!ledger.nextDate && scenario !== "setup" && (
        <div className={styles.nextLine}>
          <span className={styles.nextDot}></span>
          {`${availableText} · Next payout ${nextPayoutDay}`}
        </div>
      )}
      {ledger.onHold > 0 && (
        <div className={styles.holdLine}>
          <Lock className={styles.holdIcon} size={15} strokeWidth={1.5} />
          <span>
            {`${onHoldText} on hold · released 24 hours after each appointment (first 5 bookings)`}
          </span>
        </div>
      )}
      {!!taxHold && (
        <div className={styles.taxBanner} role="status">
          <TriangleAlert
            className={styles.taxIcon}
            size={18}
            color="var(--brand-yellow)"
            strokeWidth={1.7}
          />
          <div className={styles.taxText}>
            Payouts on hold until you add your tax details
          </div>
          <button
            className={styles.addTax}
            onClick={getHandler(onAddTax, "Opening tax details")}
          >
            Add tax details
          </button>
        </div>
      )}
      {scenario === "setup" && !taxHold && (
        <div className={styles.setupRow}>
          <div className={styles.setupText}>
            Payouts start once setup is complete
          </div>
          <button
            className={styles.continueSetup}
            onClick={getHandler(onContinueSetup, "Continuing setup")}
          >
            Continue setup
          </button>
        </div>
      )}
    </div>
  );
};
