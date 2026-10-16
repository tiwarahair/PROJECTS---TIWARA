import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { joinClassNames } from "../../../utils/class-names";
import {
  PERIODS,
  getClient,
  getMethodLabel,
  getRange,
  getRangeLabel,
} from "../data";
import type { Payout, Transaction } from "../data";
import { DEFAULT_BANK, getDayWord, getStatusStyle } from "../lists";
import type { EarningsController, EarningsProps } from "../use-earnings";
import styles from "../../../styles/components/earnings/overlays/index.module.css";
import { formatMoney } from "../../../utils/money";
import {
  toIsoDate,
  formatWeekdayDate,
  formatClockTime,
} from "../../../utils/dates";

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

/** "Not paid out yet", "Next payout" … for a transaction without a payout. */
const getNoPayoutText = ({ isRecorded, status }: Transaction): string => {
  if (isRecorded) return "Not paid out. You took this directly.";

  if (status === "On hold") return "Released 24 hours after the appointment";

  return status === "Available" ? "Next payout" : "Not paid out yet";
};

const getFeeText = ({ fee }: Transaction): string => {
  if (fee == null) return "Recorded";

  return fee > 0 ? `Fee ${formatMoney(fee, { pence: "always" })}` : "No fee";
};

const getPayoutNote = ({ status, arrive, sent }: Payout): string => {
  if (status === "Paid") return `Arrived ${formatWeekdayDate(arrive)}`;

  if (status === "Failed") return `Sent ${formatWeekdayDate(sent)}`;

  return `Expected ${formatWeekdayDate(arrive)}`;
};

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
    isDesktop,
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

  const drawerTransaction =
    drawer?.kind === "tx"
      ? ledger.transactions.find(({ id }) => id === drawer.id)
      : undefined;

  const drawerPayout =
    drawer?.kind === "po"
      ? ledger.payouts.find(({ id }) => id === drawer.id)
      : undefined;

  const isDrawerOn = !!drawer && (!!drawerTransaction || !!drawerPayout);

  const amountClass = (amount: number) =>
    amount < 0 ? styles.amountNegative : styles.amountPositive;

  // export dialog
  const exportPeriod = state.exportPeriod || period;

  const exportRange =
    exportPeriod === "custom"
      ? getRange(
          "custom",
          state.exportFrom || state.appliedFrom,
          state.exportTo || state.appliedTo,
        )
      : getRange(exportPeriod);

  const exportCount = ledger.transactions.filter(
    ({ at }) => at >= exportRange.start && at < exportRange.end,
  ).length;

  const exportRangeLabel = getRangeLabel(exportRange);
  const exportNoun = exportCount === 1 ? " transaction" : " transactions";

  const exportFrom =
    state.exportFrom || state.appliedFrom || toIsoDate(range.start);

  const exportTo = state.exportTo || state.appliedTo || lastDay(range.end);

  const transactionRow = (transaction: Transaction) => {
    const dayWord = getDayWord(transaction.at, ledger.today);

    return (
      <button
        key={transaction.id}
        className={styles.includedRow}
        onClick={() => openDrawer({ kind: "tx", id: transaction.id }, true)}
      >
        <div className={styles.rowText}>
          <div className={styles.rowName}>
            {getClient(transaction.client, props.clients).name}
          </div>
          <div className={styles.rowSub}>
            {`${transaction.description} · ${transaction.method} · ${dayWord}`}
          </div>
        </div>
        <div className={styles.alignRight}>
          <div
            className={joinClassNames(
              styles.includedNet,
              amountClass(transaction.amount),
            )}
          >
            {formatMoney(transaction.net, { pence: "always" })}
          </div>
          <div className={styles.includedFee}>{getFeeText(transaction)}</div>
        </div>
      </button>
    );
  };

  const renderTransactionDetail = (transaction: Transaction) => {
    const payout = transaction.payoutId
      ? ledger.payouts.find(({ id }) => id === transaction.payoutId)
      : undefined;

    const status = transaction.isRecorded ? "Recorded" : transaction.status;
    const appointmentDay = formatWeekdayDate(transaction.appointment);
    const appointmentTime = formatClockTime(transaction.appointment);

    return (
      <>
        <div className={styles.mutedText}>{transaction.description}</div>
        <div
          className={joinClassNames(
            styles.bigAmount,
            amountClass(transaction.amount),
          )}
        >
          {formatMoney(transaction.amount, { pence: "always" })}
        </div>
        <div className={styles.statusRow}>
          <span className={styles.statusTag} style={getStatusStyle(status)}>
            {status}
          </span>
          {transaction.isRecorded && (
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
            <span className={styles.factValue}>{transaction.service}</span>
          </div>
          <button
            className={styles.factButton}
            onClick={() => {
              if (props.onOpenBooking)
                props.onOpenBooking(transaction.bookingRef, transaction.client);
              else showToast(`Opening booking ${transaction.bookingRef}`);
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
        <div className={styles.money}>
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
            <span
              className={joinClassNames(
                styles.numeric,
                amountClass(transaction.amount),
              )}
            >
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
        <div className={styles.reference}>
          <span>Reference</span>
          <span className={styles.numeric}>
            {`${transaction.id} · ${transaction.bookingRef}`}
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
              state.drawerOut ? styles.scrimOut : styles.scrimIn,
            )}
            onClick={closeDrawer}
          ></div>
          <div
            className={joinClassNames(
              styles.drawer,
              layer,
              styles.layerPanel,
              isDesktop ? styles.drawerDesk : styles.drawerMobile,
              state.drawerOut && styles.out,
            )}
            role="dialog"
            aria-modal="true"
            aria-label={drawerTransaction ? "Transaction" : "Payout"}
          >
            <div className={styles.drawerHead}>
              {state.drawerStack.length > 0 && (
                <button
                  className={styles.iconButton}
                  onClick={() =>
                    setState(({ drawerStack }) => ({
                      drawer: drawerStack[drawerStack.length - 1] ?? null,
                      drawerStack: drawerStack.slice(0, -1),
                    }))
                  }
                  aria-label="Back"
                >
                  <ChevronLeft size={18} strokeWidth={1.7} />
                </button>
              )}
              <div className={styles.drawerTitle}>
                {drawerTransaction ? "Transaction" : "Payout"}
              </div>
              <button
                className={styles.iconButton}
                onClick={closeDrawer}
                aria-label="Close"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className={styles.drawerBody}>
              {drawerTransaction && renderTransactionDetail(drawerTransaction)}
              {drawerPayout && (
                <>
                  <div className={styles.mutedText}>{`To ${bank}`}</div>
                  <div className={styles.bigAmount}>
                    {formatMoney(drawerPayout.amount, { pence: "always" })}
                  </div>
                  <div className={styles.poStatusRow}>
                    <span
                      className={styles.statusTag}
                      style={getStatusStyle(drawerPayout.status)}
                    >
                      {drawerPayout.status}
                    </span>
                    <span className={styles.recNote}>
                      {getPayoutNote(drawerPayout)}
                    </span>
                  </div>
                  {drawerPayout.status === "Failed" && (
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
                        ["Gross", drawerPayout.gross],
                        ["Card fees", -drawerPayout.fees],
                        ["Refunds", drawerPayout.refunds],
                        ["Net", drawerPayout.amount],
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
                            {formatMoney(value, { pence: "always" })}
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
                      {drawerPayout.items.length +
                        (drawerPayout.items.length === 1
                          ? " transaction"
                          : " transactions")}
                    </div>
                  </div>
                  {drawerPayout.items
                    .slice()
                    .sort(
                      (first, second) =>
                        second.at.getTime() - first.at.getTime(),
                    )
                    .map(transactionRow)}
                  <div className={styles.reference}>
                    <span>Reference</span>
                    <span>{drawerPayout.id}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {state.exportOn && (
        <>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div
            className={joinClassNames(
              styles.scrim,
              layer,
              styles.layerScrim,
              state.exportOut ? styles.exportScrimOut : styles.exportScrimIn,
            )}
            onClick={closeExport}
          ></div>
          <div
            className={joinClassNames(
              styles.modal,
              layer,
              styles.layerPanel,
              isDesktop ? styles.modalDesk : styles.modalMobile,
              state.exportOut && styles.out,
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
                  <X size={16} strokeWidth={1.7} />
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
                        exportPeriod: id,
                        exportFrom,
                        exportTo,
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
                      ["From", "exportFrom", exportFrom],
                      ["To", "exportTo", exportTo],
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
                {`${exportRangeLabel} · ${exportCount}${exportNoun}`}
              </div>
              <div className={styles.sectionLabel}>Format</div>
              <div className={styles.formats}>
                {FORMATS.map(([id, label, subtitle]) => {
                  const isOn = state.exportFormat === id;

                  return (
                    <button
                      key={id}
                      className={joinClassNames(
                        styles.format,
                        isOn ? styles.formatOn : styles.formatOff,
                      )}
                      onClick={() => setState({ exportFormat: id })}
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
                        <span className={styles.formatSub}>{subtitle}</span>
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
            contained || isDesktop ? styles.toastDesk : styles.toastMobile,
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
