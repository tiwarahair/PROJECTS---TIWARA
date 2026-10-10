import type { CSSProperties } from "react";
import { joinClassNames } from "../../utils/class-names";
import {
  formatDay,
  PERIODS,
  formatGbp,
  getBuckets,
  getRange,
  getRangeLabel,
  getStats,
  getTakings,
  toIsoDate,
} from "./earnings-data";
import { EarningsLists } from "./earnings-lists";
import { EarningsOverlays } from "./earnings-overlays";
import { useEarnings } from "./use-earnings";
import type { EarningsProps } from "./use-earnings";
import styles from "./earnings.module.css";

export type { EarningsProps } from "./use-earnings";

const FILTERS = [
  ["all", "All"],
  ["card", "Card"],
  ["recorded", "Recorded"],
  ["fees", "Fees & refunds"],
] as const;

const WarningIcon = ({ className }: { className: string | undefined }) => (
  <svg
    className={className}
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--brand-yellow)"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3 2 20h20L12 3zM12 10v4M12 17.5v.01"></path>
  </svg>
);

/**
 * Studio → Earnings (prototype Earnings.dc.html): balance, period picker, totals, takings chart, transactions and
 * payouts with detail drawers, and the CSV / PDF export.
 */
export const Earnings = (props: EarningsProps) => {
  const earnings = useEarnings(props);
  const { rootRef, state, setState, ledger, isDesk, period, tab, range } =
    earnings;
  const contained = !!props.contained;
  const scenario = ledger.sc;
  const stats = getStats(
    ledger.tx.filter(({ at }) => at >= range.s && at < range.e),
  );
  const buckets = getBuckets(range);
  const now = new Date();
  const bars = buckets.b.map((bucket) => ({
    ...bucket,
    value: getTakings(ledger.tx, bucket.s, bucket.e),
    isFuture: bucket.s > now,
  }));
  let maxValue = 1;
  for (const { value } of bars) maxValue = Math.max(maxValue, value);
  const periodLabel =
    period === "custom"
      ? "Custom"
      : (PERIODS.find(([id]) => id === period)?.[1] ?? "This week");
  const filter = state.filt || props.filt || "all";
  const selectedBar = state.bar != null ? bars[state.bar] : undefined;
  const tiles = [
    { key: "t", label: "Takings", value: stats.takings, kind: "normal" },
    { key: "f", label: "Card fees", value: -stats.fees, kind: "normal" },
    {
      key: "r",
      label: "Refunds",
      value: stats.refunds,
      kind: stats.refunds < 0 ? "negative" : "normal",
    },
    { key: "n", label: "Net", value: stats.net, kind: "net" },
  ];
  const tileClass = {
    normal: styles.tileValueNormal,
    negative: styles.tileValueNegative,
    net: styles.tileValueNet,
  };

  return (
    <div
      className={joinClassNames(
        styles.root,
        contained ? styles.rootContained : styles.rootInline,
      )}
      ref={rootRef}
      data-screen-label="Earnings"
    >
      <div
        className={joinClassNames(
          styles.scroll,
          contained ? styles.scrollContained : styles.scrollInline,
          contained && (isDesk ? styles.padDesk : styles.padMobile),
        )}
      >
        <div className={styles.balance}>
          {scenario === "paused" && (
            <div className={styles.pausedBanner}>
              <WarningIcon className={styles.bannerIcon} />
              <div className={styles.pausedText}>
                {"Payouts paused — " +
                  formatGbp(ledger.pausedAmt) +
                  " being recovered from a refund or dispute"}
              </div>
              <button
                className={styles.learnMore}
                onClick={() => {
                  if (props.onLearnMore) props.onLearnMore();
                  else
                    earnings.showToast("Opening the help article on payouts");
                }}
              >
                Learn more
              </button>
            </div>
          )}
          <div className={styles.availableLabel}>Available</div>
          <div className={styles.availableAmount}>
            {formatGbp(ledger.available)}
          </div>
          {!!ledger.nextDate && scenario !== "setup" && (
            <div className={styles.nextLine}>
              <span className={styles.nextDot}></span>
              {formatGbp(ledger.available) +
                " · Next payout " +
                formatDay(ledger.nextDate)}
            </div>
          )}
          {ledger.onHold > 0 && (
            <div className={styles.holdLine}>
              <svg
                className={styles.holdIcon}
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="5" y="11" width="14" height="9" rx="2"></rect>
                <path d="M8 11V8a4 4 0 0 1 8 0v3"></path>
              </svg>
              <span>
                {formatGbp(ledger.onHold) +
                  " on hold · released 24 hours after each appointment (first 5 bookings)"}
              </span>
            </div>
          )}
          {!!props.taxHold && (
            <div className={styles.taxBanner} role="status">
              <WarningIcon className={styles.taxIcon} />
              <div className={styles.taxText}>
                Payouts on hold until you add your tax details
              </div>
              <button
                className={styles.addTax}
                onClick={() => {
                  if (props.onAddTax) props.onAddTax();
                  else earnings.showToast("Opening tax details");
                }}
              >
                Add tax details
              </button>
            </div>
          )}
          {scenario === "setup" && !props.taxHold && (
            <div className={styles.setupRow}>
              <div className={styles.setupText}>
                Payouts start once setup is complete
              </div>
              <button
                className={styles.continueSetup}
                onClick={() => {
                  if (props.onContinueSetup) props.onContinueSetup();
                  else earnings.showToast("Continuing setup");
                }}
              >
                Continue setup
              </button>
            </div>
          )}
        </div>

        <div className={styles.toolbar}>
          <div className={styles.periodWrap}>
            <button
              className={styles.periodButton}
              onClick={() =>
                setState({
                  ddOpen: !state.ddOpen,
                  ddCustom: period === "custom",
                  cFrom: state.aFrom || toIsoDate(range.s),
                  cTo: state.aTo || earnings.lastDay(range.e),
                  cErr: "",
                })
              }
              aria-haspopup="listbox"
              aria-expanded={state.ddOpen}
            >
              {periodLabel}
              <svg
                className={joinClassNames(
                  styles.periodChevron,
                  state.ddOpen ? styles.chevronOpen : styles.chevronClosed,
                )}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6"></path>
              </svg>
            </button>
            {state.ddOpen && (
              <>
                {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                <div
                  className={styles.periodScrim}
                  onClick={() => setState({ ddOpen: false })}
                ></div>
                <div className={styles.periodMenu} role="listbox">
                  {PERIODS.map(([id, label]) => {
                    const isOn = period === id;
                    return (
                      <button
                        key={id}
                        className={joinClassNames(
                          styles.periodOption,
                          isOn ? styles.optionOn : styles.optionOff,
                        )}
                        onClick={() => {
                          if (id === "custom") setState({ ddCustom: true });
                          else
                            setState({
                              period: id,
                              ddOpen: false,
                              ddCustom: false,
                              lim: 15,
                              bar: null,
                            });
                        }}
                        role="option"
                        aria-selected={isOn}
                      >
                        <span>{label}</span>
                        <span className={styles.periodHint}>
                          {id === "custom"
                            ? "Pick dates"
                            : getRangeLabel(getRange(id)).replace(
                                / \d{4}$/,
                                "",
                              )}
                        </span>
                      </button>
                    );
                  })}
                  {state.ddCustom && (
                    <div className={styles.customRange}>
                      {(
                        [
                          ["From", "cFrom"],
                          ["To", "cTo"],
                        ] as const
                      ).map(([label, key]) => (
                        <label key={key} className={styles.dateLabel}>
                          {label}
                          <input
                            className={styles.dateInput}
                            type="date"
                            value={state[key]}
                            onChange={(event) =>
                              setState({ [key]: event.target.value, cErr: "" })
                            }
                          />
                        </label>
                      ))}
                      {!!state.cErr && (
                        <div className={styles.customError}>{state.cErr}</div>
                      )}
                      <button
                        className={styles.apply}
                        onClick={() => {
                          if (!state.cFrom || !state.cTo)
                            return setState({ cErr: "Pick both dates." });
                          if (state.cFrom > state.cTo)
                            return setState({
                              cErr: "The start date is after the end date.",
                            });
                          setState({
                            period: "custom",
                            aFrom: state.cFrom,
                            aTo: state.cTo,
                            ddOpen: false,
                            lim: 15,
                            bar: null,
                          });
                        }}
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <div className={styles.rangeLabel}>{getRangeLabel(range)}</div>
          <span className={styles.spacer}></span>
          <button className={styles.export} onClick={earnings.openExport}>
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
              <path d="M12 4v11M7 10l5 5 5-5M5 20h14"></path>
            </svg>
            Export
          </button>
        </div>

        <div
          className={joinClassNames(
            styles.tiles,
            isDesk ? styles.tilesDesk : styles.tilesMobile,
          )}
        >
          {tiles.map(({ key, label, value, kind }) => (
            <div key={key} className={styles.tile}>
              <div className={styles.tileLabel}>{label}</div>
              <div
                className={joinClassNames(
                  styles.tileValue,
                  tileClass[kind as keyof typeof tileClass],
                )}
              >
                {formatGbp(value)}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartHead}>
            <div className={styles.strongText}>{buckets.title}</div>
            <div className={styles.chartSub}>
              {selectedBar ? selectedBar.long : getRangeLabel(range)}
            </div>
          </div>
          <div
            className={joinClassNames(
              styles.bars,
              bars.length > 10 ? styles.barsDense : styles.barsWide,
            )}
          >
            {bars.map(({ label, long, value, isFuture }, index) => {
              const isSelected = state.bar === index;
              // the bar height is the takings scaled to the busiest bucket; the delay staggers the entrance
              const barStyle = {
                "--bar-h":
                  Math.max(4, Math.round((value / maxValue) * 84)) + "px",
                "--bar-delay": (index * 0.03).toFixed(2) + "s",
              } as CSSProperties;
              return (
                <button
                  key={"b" + index}
                  className={styles.bar}
                  onClick={() => setState({ bar: isSelected ? null : index })}
                  aria-label={long + ", " + formatGbp(value)}
                >
                  <span
                    className={joinClassNames(
                      styles.barAmount,
                      isSelected
                        ? styles.barAmountShown
                        : styles.barAmountHidden,
                    )}
                  >
                    {"£" + Math.round(value)}
                  </span>
                  <span
                    className={joinClassNames(
                      styles.barFill,
                      isFuture
                        ? styles.barFuture
                        : isSelected
                          ? styles.barSelected
                          : state.bar != null
                            ? styles.barDimmed
                            : styles.barIdle,
                    )}
                    style={barStyle}
                  ></span>
                  <span
                    className={joinClassNames(
                      styles.barLabel,
                      isSelected
                        ? styles.barLabelSelected
                        : styles.barLabelIdle,
                    )}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.tabRow}>
          <div className={styles.tabs} role="tablist">
            {(
              [
                ["tx", "Transactions"],
                ["po", "Payouts"],
              ] as const
            ).map(([id, label]) => {
              const isOn = tab === id;
              return (
                <button
                  key={id}
                  className={joinClassNames(
                    styles.tab,
                    isOn ? styles.tabOn : styles.tabOff,
                  )}
                  role="tab"
                  aria-selected={isOn}
                  onClick={() => setState({ tab: id })}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {tab === "tx" && (
            <div className={styles.chips}>
              {FILTERS.map(([id, label]) => (
                <button
                  key={id}
                  className={joinClassNames(
                    styles.chip,
                    filter === id ? styles.chipOn : styles.chipOff,
                  )}
                  onClick={() => setState({ filt: id, lim: 15 })}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <EarningsLists earnings={earnings} props={props} filter={filter} />

        <div className={styles.footnote}>
          {
            "You keep every penny of your price. Clients pay the booking fee.\u00a0"
          }
        </div>
      </div>

      <EarningsOverlays earnings={earnings} props={props} />
    </div>
  );
};
