import type { CSSProperties, MouseEvent } from "react";
import { Copy, Landmark } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { DAY_MS, FALLBACK_BANK, STATUS_COLOURS, STRIPE_PAYOUTS } from "./data";
import { getClient, openUpdateBank } from "./logic";
import type { Payout, Transaction, TransactionStatus } from "./data";
import type { EarningsController, EarningsProps } from "./use-earnings";
import styles from "../../styles/components/earnings/lists.module.css";
import { formatMoney } from "../../utils/money";
import { formatWeekdayDate } from "../../utils/dates";

const FILTERS: Record<string, (transaction: Transaction) => boolean> = {
  all: () => true,
  card: ({ isRecorded }) => !isRecorded,
  recorded: ({ isRecorded }) => !!isRecorded,
  fees: ({ description }) =>
    [
      "Cancellation fee",
      "No-show fee",
      "Refund",
      "Adjustment (recovery)",
    ].includes(description),
};

/** Status tag colours from the status table. */
export const getStatusStyle = (
  status: keyof typeof STATUS_COLOURS,
): CSSProperties => {
  const [background, colour] = STATUS_COLOURS[status];

  return { "--st-bg": background, "--st-fg": colour } as CSSProperties;
};

/** Recorded (cash etc.) rows show "—" in a plain tag. */
const getTransactionStatusStyle = (transaction: Transaction): CSSProperties =>
  transaction.isRecorded
    ? ({
        "--st-bg": "transparent",
        "--st-fg": "var(--text-secondary)",
      } as CSSProperties)
    : getStatusStyle(transaction.status);

/** "Today", "Yesterday" or "14 Oct". */
export const getDayWord = (date: Date, today: Date): string => {
  const key = date.toDateString();
  const yesterday = new Date(today.getTime() - DAY_MS);

  if (key === today.toDateString()) return "Today";

  if (key === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export const EarningsLists = ({
  earnings,
  props,
  filter,
}: {
  earnings: EarningsController;
  props: EarningsProps;
  filter: string;
}) => {
  const {
    state,
    setState,
    ledger,
    isDesktop,
    tab,
    range,
    openDrawer,
    showToast,
  } = earnings;

  const selectedTransactionId =
    state.drawer?.kind === "tx" ? state.drawer.id : null;

  const selectedPayoutId = state.drawer?.kind === "po" ? state.drawer.id : null;

  const inPeriod = ledger.transactions.filter(
    ({ at }) => at >= range.start && at < range.end,
  );

  const listed = inPeriod.filter(FILTERS[filter] ?? FILTERS.all!);
  const shown = listed.slice(0, state.limit);

  const payouts = ledger.payouts.filter(
    ({ sent }) => sent >= range.start && sent < range.end,
  );

  const amountClass = (transaction: Transaction) =>
    transaction.amount < 0 ? styles.amountNegative : styles.amountPositive;

  const rowClass = (isSelected: boolean) =>
    isSelected ? styles.rowSelected : styles.rowIdle;

  const statusText = (transaction: Transaction): TransactionStatus | "—" =>
    transaction.isRecorded ? "—" : transaction.status;

  if (tab === "po")
    return (
      <div className={styles.card} data-screen-label="Payouts">
        {ledger.payouts.length === 0 && (
          <div className={styles.emptyAll}>
            <div className={styles.poEmptyIcon}>
              <Landmark size={20} strokeWidth={2} />
            </div>
            <div className={styles.poEmptyText}>
              Your first payout can take 7–14 days while Stripe sets up your
              account.
            </div>
          </div>
        )}
        {ledger.payouts.length > 0 && payouts.length === 0 && (
          <div className={styles.emptyFiltered}>
            <div className={styles.emptyTitle}>No payouts in this period</div>
            <div className={styles.emptyFilteredText}>
              Try another date range.
            </div>
          </div>
        )}
        {payouts.length > 0 && (
          <>
            {isDesktop && (
              <div className={joinClassNames(styles.tableHead, styles.poDesk)}>
                <span>Date</span>
                <span className={styles.alignRight}>Amount</span>
                <span>To</span>
                <span>Status</span>
              </div>
            )}
            {payouts.map((payout: Payout) => {
              const to = props.bankLabel || FALLBACK_BANK;

              return (
                <button
                  key={payout.id}
                  className={joinClassNames(
                    styles.poRow,
                    isDesktop ? styles.poDesk : styles.poMobile,
                    rowClass(selectedPayoutId === payout.id),
                  )}
                  onClick={() =>
                    openDrawer({ kind: "po", id: payout.id }, false)
                  }
                >
                  <span className={styles.poDateCell}>
                    <span className={styles.poDate}>
                      {formatWeekdayDate(payout.sent)}
                    </span>
                    <span
                      className={joinClassNames(
                        styles.poSub,
                        isDesktop ? styles.hideOnDesk : styles.showOnDesk,
                      )}
                    >
                      {to}
                    </span>
                  </span>
                  <span className={styles.poAmount}>
                    {formatMoney(payout.amount, { pence: "always" })}
                  </span>
                  <span
                    className={joinClassNames(
                      styles.poTo,
                      isDesktop ? styles.showOnDesk : styles.hideOnDesk,
                    )}
                  >
                    {to}
                  </span>
                  <span className={styles.poStatus}>
                    <span
                      className={styles.statusTag}
                      style={getStatusStyle(payout.status)}
                    >
                      {payout.status}
                    </span>
                    {payout.status === "Failed" && (
                      <a
                        className={styles.poFix}
                        href={STRIPE_PAYOUTS}
                        target="_blank"
                        rel="noopener"
                        onClick={(event: MouseEvent) => {
                          event.stopPropagation();
                          openUpdateBank(event, props.onUpdateBank);
                        }}
                      >
                        Update bank details in Stripe ↗
                      </a>
                    )}
                  </span>
                </button>
              );
            })}
          </>
        )}
      </div>
    );

  return (
    <div className={styles.card} data-screen-label="Transactions">
      {ledger.transactions.length === 0 && (
        <div className={styles.emptyAll}>
          <div className={styles.emptyAllTitle}>No earnings yet.</div>
          <div className={styles.emptyText}>
            Your takings will appear here after your first booking.
          </div>
          <button
            className={styles.copyLink}
            onClick={() => {
              const link = props.bookingLink || "tiwaras.house/book/tiwara";

              try {
                void navigator.clipboard?.writeText(`https://${link}`);
              } catch {
                // clipboard unavailable
              }

              showToast("Booking link copied");
            }}
          >
            <Copy size={16} strokeWidth={1.7} />
            Copy booking link
          </button>
        </div>
      )}
      {ledger.transactions.length > 0 && listed.length === 0 && (
        <div className={styles.emptyFiltered}>
          <div className={styles.emptyTitle}>Nothing in this period</div>
          <div className={styles.emptyFilteredText}>
            Try another date range or filter.
          </div>
        </div>
      )}
      {isDesktop && listed.length > 0 && (
        <div className={styles.tableScroll}>
          <div className={styles.table}>
            <div className={styles.tableHead}>
              <span>Date</span>
              <span>Client</span>
              <span>Description</span>
              <span>Method</span>
              <span className={styles.alignRight}>Amount</span>
              <span className={styles.alignRight}>Card fee</span>
              <span className={styles.alignRight}>Net</span>
              <span>Status</span>
            </div>
            {shown.map((transaction) => (
              <button
                key={transaction.id}
                className={joinClassNames(
                  styles.txRow,
                  rowClass(selectedTransactionId === transaction.id),
                )}
                onClick={() =>
                  openDrawer({ kind: "tx", id: transaction.id }, false)
                }
              >
                <span className={styles.txDate}>
                  {getDayWord(transaction.at, ledger.today)}
                </span>
                <span className={styles.txName}>
                  {getClient(transaction.client, props.clients).name}
                </span>
                <span className={styles.txDesc}>{transaction.description}</span>
                <span className={styles.txMethod}>
                  {transaction.isRecorded && (
                    <span className={styles.recordedTag}>Recorded</span>
                  )}
                  <span className={styles.txMethodText}>
                    {transaction.method}
                  </span>
                </span>
                <span
                  className={joinClassNames(
                    styles.txAmount,
                    amountClass(transaction),
                  )}
                >
                  {formatMoney(transaction.amount, { pence: "always" })}
                </span>
                <span className={styles.txFee}>
                  {transaction.fee == null
                    ? "—"
                    : formatMoney(transaction.fee, { pence: "always" })}
                </span>
                <span
                  className={joinClassNames(
                    styles.txNet,
                    amountClass(transaction),
                  )}
                >
                  {formatMoney(transaction.net, { pence: "always" })}
                </span>
                <span>
                  <span
                    className={styles.statusTag}
                    style={getTransactionStatusStyle(transaction)}
                  >
                    {statusText(transaction)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      {!isDesktop &&
        listed.length > 0 &&
        shown.map((transaction) => {
          const dayWord = getDayWord(transaction.at, ledger.today);

          return (
            <button
              key={transaction.id}
              className={joinClassNames(
                styles.txItem,
                rowClass(selectedTransactionId === transaction.id),
              )}
              onClick={() =>
                openDrawer({ kind: "tx", id: transaction.id }, false)
              }
            >
              <div className={styles.itemText}>
                <div className={styles.itemName}>
                  {getClient(transaction.client, props.clients).name}
                </div>
                <div className={styles.itemSub}>
                  {transaction.isRecorded && (
                    <span className={styles.recordedSmall}>Recorded</span>
                  )}
                  <span className={styles.itemSubText}>
                    {`${transaction.description} · ${transaction.method} · ${dayWord}`}
                  </span>
                </div>
              </div>
              <div className={styles.itemSide}>
                <span
                  className={joinClassNames(
                    styles.itemAmount,
                    amountClass(transaction),
                  )}
                >
                  {formatMoney(transaction.amount, { pence: "always" })}
                </span>
                <span
                  className={styles.statusSmall}
                  style={getTransactionStatusStyle(transaction)}
                >
                  {statusText(transaction)}
                </span>
              </div>
            </button>
          );
        })}
      {listed.length > state.limit && (
        <button
          className={styles.more}
          onClick={() => setState({ limit: state.limit + 15 })}
        >
          {`Show ${Math.min(15, listed.length - state.limit)} more`}
        </button>
      )}
    </div>
  );
};
