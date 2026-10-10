import type { CSSProperties, MouseEvent } from "react";
import { joinClassNames } from "../../utils/class-names";
import {
  STATUS_COLOURS,
  formatDay,
  formatGbp,
  getClient,
} from "./earnings-data";
import type { Payout, Transaction, TxStatus } from "./earnings-data";
import type { EarningsController, EarningsProps } from "./use-earnings";
import styles from "./earnings-lists.module.css";

const DAY_MS = 86400000;
export const DEFAULT_BANK = "Barclays •••• 4471";
const STRIPE_PAYOUTS = "https://dashboard.stripe.com/settings/payouts";

const FILTERS: Record<string, (transaction: Transaction) => boolean> = {
  all: () => true,
  card: ({ rec }) => !rec,
  recorded: ({ rec }) => !!rec,
  fees: ({ desc }) =>
    [
      "Cancellation fee",
      "No-show fee",
      "Refund",
      "Adjustment (recovery)",
    ].includes(desc),
};

/** Status tag colours from the status table (prototype STT). */
export const getStatusStyle = (
  status: keyof typeof STATUS_COLOURS,
): CSSProperties => {
  const [background, colour] = STATUS_COLOURS[status];
  return { "--st-bg": background, "--st-fg": colour } as CSSProperties;
};

/** Recorded (cash etc.) rows show "—" in a plain tag. */
export const getTxStatusStyle = (transaction: Transaction): CSSProperties =>
  transaction.rec
    ? ({
        "--st-bg": "transparent",
        "--st-fg": "var(--text-secondary)",
      } as CSSProperties)
    : getStatusStyle(transaction.status);

/** "Today", "Yesterday" or "14 Oct" (prototype dWord). */
export const getDayWord = (date: Date, today: Date): string => {
  const key = date.toDateString();
  const yesterday = new Date(today.getTime() - DAY_MS);
  return key === today.toDateString()
    ? "Today"
    : key === yesterday.toDateString()
      ? "Yesterday"
      : date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
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
  const { state, setState, ledger, isDesk, tab, range, openDrawer, showToast } =
    earnings;
  const selectedTx = state.drawer?.k === "tx" ? state.drawer.id : null;
  const selectedPo = state.drawer?.k === "po" ? state.drawer.id : null;
  const inPeriod = ledger.tx.filter(({ at }) => at >= range.s && at < range.e);
  const listed = inPeriod.filter(FILTERS[filter] ?? FILTERS.all!);
  const shown = listed.slice(0, state.lim);
  const payouts = ledger.payouts.filter(
    ({ sent }) => sent >= range.s && sent < range.e,
  );
  const amountClass = (transaction: Transaction) =>
    transaction.amount < 0 ? styles.amountNegative : styles.amountPositive;
  const rowClass = (isSelected: boolean) =>
    isSelected ? styles.rowSelected : styles.rowIdle;
  const statusText = (transaction: Transaction): TxStatus | "—" =>
    transaction.rec ? "—" : transaction.status;

  if (tab === "po")
    return (
      <div className={styles.card} data-screen-label="Payouts">
        {ledger.payouts.length === 0 && (
          <div className={styles.emptyAll}>
            <div className={styles.poEmptyIcon}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18M12 3l9 5H3l9-5z"></path>
              </svg>
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
            {isDesk && (
              <div className={joinClassNames(styles.tableHead, styles.poDesk)}>
                <span>Date</span>
                <span className={styles.alignRight}>Amount</span>
                <span>To</span>
                <span>Status</span>
              </div>
            )}
            {payouts.map((payout: Payout) => {
              const to = props.bankLabel || DEFAULT_BANK;
              return (
                <button
                  key={payout.id}
                  className={joinClassNames(
                    styles.poRow,
                    isDesk ? styles.poDesk : styles.poMobile,
                    rowClass(selectedPo === payout.id),
                  )}
                  onClick={() => openDrawer({ k: "po", id: payout.id }, false)}
                >
                  <span className={styles.poDateCell}>
                    <span className={styles.poDate}>
                      {formatDay(payout.sent)}
                    </span>
                    <span
                      className={joinClassNames(
                        styles.poSub,
                        isDesk ? styles.hideOnDesk : styles.showOnDesk,
                      )}
                    >
                      {to}
                    </span>
                  </span>
                  <span className={styles.poAmount}>
                    {formatGbp(payout.amount)}
                  </span>
                  <span
                    className={joinClassNames(
                      styles.poTo,
                      isDesk ? styles.showOnDesk : styles.hideOnDesk,
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
                        onClick={(event: MouseEvent) => event.stopPropagation()}
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
      {ledger.tx.length === 0 && (
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
                void navigator.clipboard?.writeText("https://" + link);
              } catch {
                // clipboard unavailable
              }
              showToast("Booking link copied");
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="11" height="11" rx="2"></rect>
              <path d="M5 15V5a1 1 0 0 1 1-1h9"></path>
            </svg>
            Copy booking link
          </button>
        </div>
      )}
      {ledger.tx.length > 0 && listed.length === 0 && (
        <div className={styles.emptyFiltered}>
          <div className={styles.emptyTitle}>Nothing in this period</div>
          <div className={styles.emptyFilteredText}>
            Try another date range or filter.
          </div>
        </div>
      )}
      {isDesk && listed.length > 0 && (
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
                  rowClass(selectedTx === transaction.id),
                )}
                onClick={() =>
                  openDrawer({ k: "tx", id: transaction.id }, false)
                }
              >
                <span className={styles.txDate}>
                  {getDayWord(transaction.at, ledger.T0)}
                </span>
                <span className={styles.txName}>
                  {getClient(transaction.client, props.clients).name}
                </span>
                <span className={styles.txDesc}>{transaction.desc}</span>
                <span className={styles.txMethod}>
                  {transaction.rec && (
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
                  {formatGbp(transaction.amount)}
                </span>
                <span className={styles.txFee}>
                  {transaction.fee == null ? "—" : formatGbp(transaction.fee)}
                </span>
                <span
                  className={joinClassNames(
                    styles.txNet,
                    amountClass(transaction),
                  )}
                >
                  {formatGbp(transaction.net)}
                </span>
                <span>
                  <span
                    className={styles.statusTag}
                    style={getTxStatusStyle(transaction)}
                  >
                    {statusText(transaction)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      {!isDesk &&
        listed.length > 0 &&
        shown.map((transaction) => (
          <button
            key={transaction.id}
            className={joinClassNames(
              styles.txItem,
              rowClass(selectedTx === transaction.id),
            )}
            onClick={() => openDrawer({ k: "tx", id: transaction.id }, false)}
          >
            <div className={styles.itemText}>
              <div className={styles.itemName}>
                {getClient(transaction.client, props.clients).name}
              </div>
              <div className={styles.itemSub}>
                {transaction.rec && (
                  <span className={styles.recordedSmall}>Recorded</span>
                )}
                <span className={styles.itemSubText}>
                  {transaction.desc +
                    " · " +
                    transaction.method +
                    " · " +
                    getDayWord(transaction.at, ledger.T0)}
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
                {formatGbp(transaction.amount)}
              </span>
              <span
                className={styles.statusSmall}
                style={getTxStatusStyle(transaction)}
              >
                {statusText(transaction)}
              </span>
            </div>
          </button>
        ))}
      {listed.length > state.lim && (
        <button
          className={styles.more}
          onClick={() => setState({ lim: state.lim + 15 })}
        >
          {"Show " + Math.min(15, listed.length - state.lim) + " more"}
        </button>
      )}
    </div>
  );
};
