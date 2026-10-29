import { Lock, ShieldAlert, TriangleAlert } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import type { EarningsController, EarningsProps } from "./use-earnings";
import styles from "../../styles/components/earnings/balance.module.css";
import { formatMoney } from "../../utils/money";
import { formatWeekdayDate } from "../../utils/dates";

interface BalanceProps {
  earnings: EarningsController;
  props: EarningsProps;
}

export const Balance = ({
  earnings: { ledger, showToast, openPaused },
  props: {
    taxHold,
    failedPayout,
    dispute,
    onAddTax,
    onContinueSetup,
    onUpdateBank,
  },
}: BalanceProps) => {
  const { scenario } = ledger;
  const pausedText = formatMoney(ledger.pausedAmount, { pence: "always" });

  const availableText = ledger.isBalanceKnown
    ? formatMoney(ledger.available, { pence: "always" })
    : "—";

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
          <button className={styles.learnMore} onClick={openPaused}>
            Learn more
          </button>
        </div>
      )}
      <div className={styles.availableLabel}>Available</div>
      <div className={styles.availableAmount}>{availableText}</div>
      {!ledger.isBalanceKnown && (
        <div className={styles.nextLine}>
          Your balance couldn’t load from Stripe. Refresh to try again.
        </div>
      )}
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
      {dispute && (
        <div
          className={joinClassNames(styles.taxBanner, styles.failedBanner)}
          role="alert"
        >
          <ShieldAlert
            className={styles.taxIcon}
            size={18}
            color="var(--accent-200)"
            strokeWidth={1.7}
          />
          <div className={styles.failedText}>{dispute.text}</div>
          <button className={styles.addTax} onClick={dispute.onRespond}>
            Respond
          </button>
        </div>
      )}
      {!!failedPayout && !dispute && (
        <div
          className={joinClassNames(styles.taxBanner, styles.failedBanner)}
          role="alert"
        >
          <TriangleAlert
            className={styles.taxIcon}
            size={18}
            color="var(--accent-200)"
            strokeWidth={1.7}
          />
          <div className={styles.failedText}>
            {`Your ${formatMoney(failedPayout, { pence: "always" })} payout couldn’t be sent. Your bank rejected it.`}
          </div>
          <button
            className={styles.addTax}
            onClick={getHandler(onUpdateBank, "Opening Stripe")}
          >
            Update bank details
          </button>
        </div>
      )}
      {!!taxHold && !failedPayout && !dispute && (
        <div className={styles.taxBanner} role="status">
          <TriangleAlert
            className={styles.taxIcon}
            size={18}
            color="var(--brand-yellow)"
            strokeWidth={1.7}
          />
          <div className={styles.taxText}>Add your tax details to go live</div>
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
