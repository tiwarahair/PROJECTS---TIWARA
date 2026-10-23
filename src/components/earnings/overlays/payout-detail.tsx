import { joinClassNames } from "../../../utils/class-names";
import { formatWeekdayDate } from "../../../utils/dates";
import { formatMoney } from "../../../utils/money";
import { FALLBACK_BANK, STRIPE_PAYOUTS } from "../data";
import type { Payout, Transaction } from "../data";
import { getDayWord, getStatusStyle } from "../lists";
import { getClient, openUpdateBank } from "../logic";
import type { EarningsController, EarningsProps } from "../use-earnings";
import { getAmountClass } from "./amount";
import shared from "../../../styles/components/earnings/overlays/index.module.css";
import styles from "../../../styles/components/earnings/overlays/payout-detail.module.css";

const getFeeText = ({ fee }: Transaction): string => {
  if (fee == null) return "Recorded";

  return fee > 0 ? `Fee ${formatMoney(fee, { pence: "always" })}` : "No fee";
};

const getPayoutNote = ({ status, arrive, sent }: Payout): string => {
  if (status === "Paid") return `Arrived ${formatWeekdayDate(arrive)}`;

  if (status === "Failed") return `Sent ${formatWeekdayDate(sent)}`;

  return `Expected ${formatWeekdayDate(arrive)}`;
};

interface IncludedRowProps {
  earnings: EarningsController;
  props: EarningsProps;
  transaction: Transaction;
}

const IncludedRow = ({
  earnings: { ledger, openDrawer },
  props,
  transaction,
}: IncludedRowProps) => (
  <button
    className={styles.includedRow}
    onClick={() => openDrawer({ kind: "tx", id: transaction.id }, true)}
  >
    <div className={styles.rowText}>
      <div className={styles.rowName}>
        {getClient(transaction.client, props.clients).name}
      </div>
      <div className={styles.rowSub}>
        {`${transaction.description} · ${transaction.method} · ${getDayWord(transaction.at, ledger.today)}`}
      </div>
    </div>
    <div className={styles.alignRight}>
      <div
        className={joinClassNames(
          styles.includedNet,
          getAmountClass(transaction.amount),
        )}
      >
        {formatMoney(transaction.net, { pence: "always" })}
      </div>
      <div className={styles.includedFee}>{getFeeText(transaction)}</div>
    </div>
  </button>
);

interface PayoutDetailProps {
  earnings: EarningsController;
  props: EarningsProps;
  payout: Payout;
}

export const PayoutDetail = ({
  earnings,
  props,
  payout,
}: PayoutDetailProps) => {
  const totals = [
    ["Gross", payout.gross],
    ["Card fees", -payout.fees],
    ["Refunds", payout.refunds],
    ["Net", payout.amount],
  ] as const;

  return (
    <>
      <div className={shared.mutedText}>
        {`To ${props.bankLabel || FALLBACK_BANK}`}
      </div>
      <div className={shared.bigAmount}>
        {formatMoney(payout.amount, { pence: "always" })}
      </div>
      <div className={styles.poStatusRow}>
        <span
          className={shared.statusTag}
          style={getStatusStyle(payout.status)}
        >
          {payout.status}
        </span>
        <span className={shared.recNote}>{getPayoutNote(payout)}</span>
      </div>
      {payout.status === "Failed" && (
        <div className={styles.failed}>
          <div className={styles.failedText}>
            Your bank rejected this payout. The money is back in your available
            balance and we’ll retry once your details are fixed.
          </div>
          <a
            className={styles.failedLink}
            href={STRIPE_PAYOUTS}
            target="_blank"
            rel="noopener"
            onClick={(event) => openUpdateBank(event, props.onUpdateBank)}
          >
            Update bank details in Stripe ↗
          </a>
        </div>
      )}
      <div className={shared.money}>
        {totals.map(([label, value], index) => {
          const isNet = index === 3;

          return (
            <div
              key={label}
              className={joinClassNames(
                styles.totalRow,
                isNet && styles.totalRowNet,
              )}
            >
              <span>{label}</span>
              <span
                className={joinClassNames(
                  shared.numeric,
                  value < 0 && !isNet
                    ? styles.totalValueNegative
                    : styles.totalValue,
                )}
              >
                {formatMoney(value, { pence: "always" })}
              </span>
            </div>
          );
        })}
      </div>
      <div className={styles.includedHead}>
        <div className={styles.strongText}>Included transactions</div>
        <div className={shared.mutedText}>
          {payout.items.length +
            (payout.items.length === 1 ? " transaction" : " transactions")}
        </div>
      </div>
      {payout.items
        .slice()
        .sort((first, second) => second.at.getTime() - first.at.getTime())
        .map((transaction) => (
          <IncludedRow
            key={transaction.id}
            earnings={earnings}
            props={props}
            transaction={transaction}
          />
        ))}
      <div className={shared.reference}>
        <span>Reference</span>
        <span>{payout.id}</span>
      </div>
    </>
  );
};
