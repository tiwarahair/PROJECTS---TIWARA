import { joinClassNames } from "../../utils/class-names";
import {
  PERIODS,
  formatDay,
  formatGbp,
  formatTime,
  getClient,
  getMethodLabel,
  getRange,
  getRangeLabel,
  toIsoDate,
} from "./earnings-data";
import type { Transaction } from "./earnings-data";
import { DEFAULT_BANK, getDayWord, getStatusStyle } from "./earnings-lists";
import type { EarningsController, EarningsProps } from "./use-earnings";
import styles from "./earnings-overlays.module.css";

const STRIPE_PAYOUTS = "https://dashboard.stripe.com/settings/payouts";
const FORMATS = [
  [
    "csv",
    "CSV",
    "All transactions, one row each. Opens in Excel, Numbers and Google Sheets.",
  ],
  [
    "pdf",
    "PDF statement",
    "Monthly statement with each type on its own dated lines, totals and payouts.",
  ],
] as const;

const Chevron = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m9 6 6 6-6 6"></path>
  </svg>
);

const CloseIcon = ({
  size,
  strokeWidth,
}: {
  size: number;
  strokeWidth: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
  >
    <path d="M18 6 6 18M6 6l12 12"></path>
  </svg>
);

/** "Not paid out yet", "Next payout" … for a transaction without a payout. */
const getNoPayoutText = ({ rec, status }: Transaction): string =>
  rec
    ? "Not paid out. You took this directly."
    : status === "On hold"
      ? "Released 24 hours after the appointment"
      : status === "Available"
        ? "Next payout"
        : "Not paid out yet";

export const EarningsOverlays = ({
  earnings,
  props,
}: {
  earnings: EarningsController;
  props: EarningsProps;
}) => {
  const {
    state,
    setState,
    ledger,
    isDesk,
    period,
    range,
    openDrawer,
    closeDrawer,
    closeExport,
    doExport,
    showToast,
    lastDay,
  } = earnings;
  const contained = !!props.contained;
  const layer = contained ? styles.contained : styles.fixed;
  const bank = props.bankLabel || DEFAULT_BANK;
  const { drawer } = state;
  const drawerTx =
    drawer?.k === "tx"
      ? ledger.tx.find(({ id }) => id === drawer.id)
      : undefined;
  const drawerPo =
    drawer?.k === "po"
      ? ledger.payouts.find(({ id }) => id === drawer.id)
      : undefined;
  const isDrawerOn = !!drawer && (!!drawerTx || !!drawerPo);
  const amountClass = (amount: number) =>
    amount < 0 ? styles.amountNegative : styles.amountPositive;

  // export
  const exportPeriod = state.exPeriod || period;
  const exportRange =
    exportPeriod === "custom"
      ? getRange("custom", state.exFrom || state.aFrom, state.exTo || state.aTo)
      : getRange(exportPeriod);
  const exportCount = ledger.tx.filter(
    ({ at }) => at >= exportRange.s && at < exportRange.e,
  ).length;
  const exportFrom = state.exFrom || state.aFrom || toIsoDate(range.s);
  const exportTo = state.exTo || state.aTo || lastDay(range.e);

  const transactionRow = (transaction: Transaction) => (
    <button
      key={transaction.id}
      className={styles.includedRow}
      onClick={() => openDrawer({ k: "tx", id: transaction.id }, true)}
    >
      <div className={styles.rowText}>
        <div className={styles.rowName}>
          {getClient(transaction.client, props.clients).name}
        </div>
        <div className={styles.rowSub}>
          {transaction.desc +
            " · " +
            transaction.method +
            " · " +
            getDayWord(transaction.at, ledger.T0)}
        </div>
      </div>
      <div className={styles.alignRight}>
        <div
          className={joinClassNames(
            styles.includedNet,
            amountClass(transaction.amount),
          )}
        >
          {formatGbp(transaction.net)}
        </div>
        <div className={styles.includedFee}>
          {transaction.fee == null
            ? "Recorded"
            : transaction.fee > 0
              ? "Fee " + formatGbp(transaction.fee)
              : "No fee"}
        </div>
      </div>
    </button>
  );

  const renderTransactionDetail = (transaction: Transaction) => {
    const payout = transaction.po
      ? ledger.payouts.find(({ id }) => id === transaction.po)
      : undefined;
    const status = transaction.rec ? "Recorded" : transaction.status;
    return (
      <>
        <div className={styles.mutedText}>{transaction.desc}</div>
        <div
          className={joinClassNames(
            styles.bigAmount,
            amountClass(transaction.amount),
          )}
        >
          {formatGbp(transaction.amount)}
        </div>
        <div className={styles.statusRow}>
          <span className={styles.statusTag} style={getStatusStyle(status)}>
            {status}
          </span>
          {transaction.rec && (
            <span className={styles.recNote}>
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
            <span className={styles.factValue}>{transaction.svc}</span>
          </div>
          <button
            className={styles.factButton}
            onClick={() => {
              if (props.onOpenBooking)
                props.onOpenBooking(transaction.bref, transaction.client);
              else showToast("Opening booking " + transaction.bref);
            }}
          >
            <span className={styles.factLabel}>Appointment</span>
            <span className={styles.factLink}>
              {formatDay(transaction.appt) +
                ", " +
                formatTime(transaction.appt)}
              <Chevron />
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
              {formatDay(transaction.at) + ", " + formatTime(transaction.at)}
            </span>
          </div>
        </div>
        <div className={styles.money}>
          <div className={styles.moneyRow}>
            <span>Amount</span>
            <span className={styles.moneyValue}>
              {formatGbp(transaction.amount)}
            </span>
          </div>
          <div className={styles.moneyRow}>
            <span>Card fee</span>
            <span className={styles.moneyValue}>
              {transaction.fee == null ? "—" : formatGbp(transaction.fee)}
            </span>
          </div>
          <div className={styles.moneyNet}>
            <span>Net</span>
            <span
              className={joinClassNames(
                styles.numeric,
                amountClass(transaction.amount),
              )}
            >
              {formatGbp(transaction.net)}
            </span>
          </div>
        </div>
        <div className={styles.payoutRow}>
          <span className={styles.factLabel}>Payout</span>
          {payout && (
            <button
              className={styles.payoutLink}
              onClick={() => openDrawer({ k: "po", id: payout.id }, true)}
            >
              {payout.id + " · " + formatDay(payout.sent)}
              <Chevron />
            </button>
          )}
          {!payout && (
            <span className={styles.payoutNone}>
              {getNoPayoutText(transaction)}
            </span>
          )}
        </div>
        <div className={styles.reference}>
          <span>Reference</span>
          <span className={styles.numeric}>
            {transaction.id + " · " + transaction.bref}
          </span>
        </div>
      </>
    );
  };

  return (
    <>
      {isDrawerOn && (
        <>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div
            className={joinClassNames(
              styles.scrim,
              layer,
              styles.layerScrim,
              state.drOut ? styles.scrimOut : styles.scrimIn,
            )}
            onClick={closeDrawer}
          ></div>
          <div
            className={joinClassNames(
              styles.drawer,
              layer,
              styles.layerPanel,
              isDesk ? styles.drawerDesk : styles.drawerMobile,
              state.drOut && styles.out,
            )}
            role="dialog"
            aria-modal="true"
            aria-label={drawerTx ? "Transaction" : "Payout"}
          >
            <div className={styles.drawerHead}>
              {state.drStack.length > 0 && (
                <button
                  className={styles.iconButton}
                  onClick={() =>
                    setState(({ drStack }) => ({
                      drawer: drStack[drStack.length - 1] ?? null,
                      drStack: drStack.slice(0, -1),
                    }))
                  }
                  aria-label="Back"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m15 6-6 6 6 6"></path>
                  </svg>
                </button>
              )}
              <div className={styles.drawerTitle}>
                {drawerTx ? "Transaction" : "Payout"}
              </div>
              <button
                className={styles.iconButton}
                onClick={closeDrawer}
                aria-label="Close"
              >
                <CloseIcon size={18} strokeWidth="2" />
              </button>
            </div>
            <div className={styles.drawerBody}>
              {drawerTx && renderTransactionDetail(drawerTx)}
              {drawerPo && (
                <>
                  <div className={styles.mutedText}>{"To " + bank}</div>
                  <div className={styles.bigAmount}>
                    {formatGbp(drawerPo.amount)}
                  </div>
                  <div className={styles.poStatusRow}>
                    <span
                      className={styles.statusTag}
                      style={getStatusStyle(drawerPo.status)}
                    >
                      {drawerPo.status}
                    </span>
                    <span className={styles.recNote}>
                      {drawerPo.status === "Paid"
                        ? "Arrived " + formatDay(drawerPo.arrive)
                        : drawerPo.status === "Failed"
                          ? "Sent " + formatDay(drawerPo.sent)
                          : "Expected " + formatDay(drawerPo.arrive)}
                    </span>
                  </div>
                  {drawerPo.status === "Failed" && (
                    <div className={styles.failed}>
                      <div className={styles.failedText}>
                        Your bank rejected this payout. The money is back in
                        your available balance and we’ll retry once your details
                        are fixed.
                      </div>
                      <a
                        className={styles.failedLink}
                        href={STRIPE_PAYOUTS}
                        target="_blank"
                        rel="noopener"
                      >
                        Update bank details in Stripe ↗
                      </a>
                    </div>
                  )}
                  <div className={styles.money}>
                    {(
                      [
                        ["Gross", drawerPo.gross],
                        ["Card fees", -drawerPo.fees],
                        ["Refunds", drawerPo.refunds],
                        ["Net", drawerPo.amount],
                      ] as const
                    ).map(([label, value], index) => {
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
                              styles.numeric,
                              value < 0 && !isNet
                                ? styles.totalValueNegative
                                : styles.totalValue,
                            )}
                          >
                            {formatGbp(value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className={styles.includedHead}>
                    <div className={styles.strongText}>
                      Included transactions
                    </div>
                    <div className={styles.mutedText}>
                      {drawerPo.items.length +
                        (drawerPo.items.length === 1
                          ? " transaction"
                          : " transactions")}
                    </div>
                  </div>
                  {drawerPo.items
                    .slice()
                    .sort(
                      (first, second) =>
                        second.at.getTime() - first.at.getTime(),
                    )
                    .map(transactionRow)}
                  <div className={styles.reference}>
                    <span>Reference</span>
                    <span>{drawerPo.id}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {state.exOn && (
        <>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div
            className={joinClassNames(
              styles.scrim,
              layer,
              styles.layerScrim,
              state.exOut ? styles.exportScrimOut : styles.exportScrimIn,
            )}
            onClick={closeExport}
          ></div>
          <div
            className={joinClassNames(
              styles.modal,
              layer,
              styles.layerPanel,
              isDesk ? styles.modalDesk : styles.modalMobile,
              state.exOut && styles.out,
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Export earnings"
          >
            <div className={styles.modalBody}>
              <div className={styles.modalHead}>
                <div className={styles.modalTitle}>Export earnings</div>
                <button
                  className={styles.modalClose}
                  onClick={closeExport}
                  aria-label="Close"
                >
                  <CloseIcon size={16} strokeWidth="1.7" />
                </button>
              </div>
              <div className={styles.sectionLabel}>Date range</div>
              <div className={styles.periods}>
                {PERIODS.map(([id, label]) => (
                  <button
                    key={id}
                    className={joinClassNames(
                      styles.periodChip,
                      exportPeriod === id ? styles.chipOn : styles.chipOff,
                    )}
                    onClick={() =>
                      setState({
                        exPeriod: id,
                        exFrom: exportFrom,
                        exTo: exportTo,
                      })
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              {exportPeriod === "custom" && (
                <div className={styles.customDates}>
                  {(
                    [
                      ["From", "exFrom", exportFrom],
                      ["To", "exTo", exportTo],
                    ] as const
                  ).map(([label, key, value]) => (
                    <label key={key} className={styles.dateLabel}>
                      {label}
                      <input
                        className={styles.dateInput}
                        type="date"
                        value={value}
                        onChange={(event) =>
                          setState({ [key]: event.target.value })
                        }
                      />
                    </label>
                  ))}
                </div>
              )}
              <div className={styles.exportRange}>
                {getRangeLabel(exportRange) +
                  " · " +
                  exportCount +
                  (exportCount === 1 ? " transaction" : " transactions")}
              </div>
              <div className={styles.sectionLabel}>Format</div>
              <div className={styles.formats}>
                {FORMATS.map(([id, label, sub]) => {
                  const isOn = state.exFmt === id;
                  return (
                    <button
                      key={id}
                      className={joinClassNames(
                        styles.format,
                        isOn ? styles.formatOn : styles.formatOff,
                      )}
                      onClick={() => setState({ exFmt: id })}
                      role="radio"
                      aria-checked={isOn}
                    >
                      <span
                        className={joinClassNames(
                          styles.ring,
                          isOn ? styles.ringOn : styles.ringOff,
                        )}
                      >
                        <span
                          className={joinClassNames(
                            styles.dot,
                            isOn ? styles.dotOn : styles.dotOff,
                          )}
                        ></span>
                      </span>
                      <span>
                        <span
                          className={joinClassNames(
                            styles.formatLabel,
                            isOn ? styles.formatLabelOn : styles.formatLabelOff,
                          )}
                        >
                          {label}
                        </span>
                        <span className={styles.formatSub}>{sub}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancel} onClick={closeExport}>
                Cancel
              </button>
              <button className={styles.download} onClick={doExport}>
                Download
              </button>
            </div>
          </div>
        </>
      )}

      {!!state.toast && (
        <div
          className={joinClassNames(
            styles.toast,
            layer,
            styles.layerToast,
            contained || isDesk ? styles.toastDesk : styles.toastMobile,
            state.toastOut ? styles.toastOut : styles.toastIn,
          )}
          role="status"
        >
          {state.toast}
        </div>
      )}
    </>
  );
};
