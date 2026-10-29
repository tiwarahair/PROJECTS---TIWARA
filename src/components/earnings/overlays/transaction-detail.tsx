import { ChevronRight } from "lucide-react";
import { joinClassNames } from "../../../utils/class-names";
import { formatClockTime, formatWeekdayDate } from "../../../utils/dates";
import { formatMoney } from "../../../utils/money";
import type { Transaction } from "../data";
import { getStatusStyle } from "../lists";
import { getClient, getMethodLabel } from "../logic";
import type { EarningsController, EarningsProps } from "../use-earnings";
import { getAmountClass } from "./amount";
import shared from "../../../styles/components/earnings/overlays/index.module.css";
import styles from "../../../styles/components/earnings/overlays/transaction-detail.module.css";

/** "Not paid out yet", "Next payout" … for a transaction without a payout. */
const getNoPayoutText = ({ isRecorded, status }: Transaction): string => {
  if (isRecorded) return "Not paid out. You took this directly.";

  if (status === "On hold") return "Released 24 hours after the appointment";

  return status === "Available" ? "Next payout" : "Not paid out yet";
};

interface TransactionDetailProps {
  earnings: EarningsController;
  props: EarningsProps;
  transaction: Transaction;
}

export const TransactionDetail = ({
  earnings: { ledger, openDrawer, closeDrawer, showToast },
  props,
  transaction,
}: TransactionDetailProps) => {
  const payout = transaction.payoutId
    ? ledger.payouts.find(({ id }) => id === transaction.payoutId)
    : undefined;

  const status = transaction.isRecorded ? "Recorded" : transaction.status;
  const appointmentDay = formatWeekdayDate(transaction.appointment);
  const appointmentTime = formatClockTime(transaction.appointment);
  const amountClass = getAmountClass(transaction.amount);

  return (
    <>
      <div className={shared.mutedText}>{transaction.description}</div>
      <div className={joinClassNames(shared.bigAmount, amountClass)}>
        {formatMoney(transaction.amount, { pence: "always" })}
      </div>
      <div className={styles.statusRow}>
        <span className={shared.statusTag} style={getStatusStyle(status)}>
          {status}
        </span>
        {transaction.isRecorded && (
          <span className={shared.recNote}>
            Doesn’t count towards your balance
          </span>
        )}
      </div>
      {!!transaction.note && (
        <div className={styles.note}>{transaction.note}</div>
      )}
      <div className={styles.facts}>
        <div className={styles.fact}>
          <span className={styles.factLabel}>Client</span>
          <span className={styles.factStrong}>
            {getClient(transaction.client, props.clients).name}
          </span>
        </div>
        <div className={styles.fact}>
          <span className={styles.factLabel}>Service</span>
          <span className={styles.factValue}>{transaction.service}</span>
        </div>
        <button
          className={styles.factButton}
          onClick={() => {
            // the drawer sits above the host's sheets, so it closes first
            if (props.onOpenBooking) {
              closeDrawer();
              props.onOpenBooking(transaction.bookingRef, transaction.client);
            } else showToast(`Opening booking ${transaction.bookingRef}`);
          }}
        >
          <span className={styles.factLabel}>Appointment</span>
          <span className={styles.factLink}>
            {`${appointmentDay}, ${appointmentTime}`}
            <ChevronRight size={15} strokeWidth={1.7} />
          </span>
        </button>
        <div className={styles.fact}>
          <span className={styles.factLabel}>Method</span>
          <span className={styles.factValue}>
            {getMethodLabel(transaction)}
          </span>
        </div>
        <div className={styles.fact}>
          <span className={styles.factLabel}>Taken</span>
          <span className={styles.factNumeric}>
            {`${formatWeekdayDate(transaction.at)}, ${formatClockTime(transaction.at)}`}
          </span>
        </div>
      </div>
      <div className={shared.money}>
        <div className={styles.moneyRow}>
          <span>Amount</span>
          <span className={styles.moneyValue}>
            {formatMoney(transaction.amount, { pence: "always" })}
          </span>
        </div>
        <div className={styles.moneyRow}>
          <span>Card fee</span>
          <span className={styles.moneyValue}>
            {transaction.fee == null
              ? "—"
              : formatMoney(transaction.fee, { pence: "always" })}
          </span>
        </div>
        <div className={styles.moneyNet}>
          <span>Net</span>
          <span className={joinClassNames(shared.numeric, amountClass)}>
            {formatMoney(transaction.net, { pence: "always" })}
          </span>
        </div>
      </div>
      <div className={styles.payoutRow}>
        <span className={styles.factLabel}>Payout</span>
        {payout && (
          <button
            className={styles.payoutLink}
            onClick={() => openDrawer({ kind: "po", id: payout.id }, true)}
          >
            {`${payout.id} · ${formatWeekdayDate(payout.sent)}`}
            <ChevronRight size={15} strokeWidth={1.7} />
          </button>
        )}
        {!payout && (
          <span className={styles.payoutNone}>
            {getNoPayoutText(transaction)}
          </span>
        )}
      </div>
      <div className={shared.reference}>
        <span>Reference</span>
        <span className={shared.numeric}>
          {`${transaction.id} · ${transaction.bookingRef}`}
        </span>
      </div>
    </>
  );
};
