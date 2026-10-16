import { X } from "lucide-react";
import { joinClassNames } from "../../../utils/class-names";
import { toIsoDate } from "../../../utils/dates";
import { PERIODS } from "../data";
import { getRange, getRangeLabel } from "../dates";
import type { EarningsController } from "../use-earnings";
import shared from "../../../styles/components/earnings/overlays/index.module.css";
import styles from "../../../styles/components/earnings/overlays/export-dialog.module.css";

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

interface ExportDialogProps {
  earnings: EarningsController;
  layer: string | undefined;
}

export const ExportDialog = ({
  earnings: {
    state,
    setState,
    ledger,
    isDesktop,
    period,
    range,
    closeExport,
    doExport,
    lastDay,
  },
  layer,
}: ExportDialogProps) => {
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

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={joinClassNames(
          shared.scrim,
          layer,
          shared.layerScrim,
          state.exportOut ? styles.exportScrimOut : styles.exportScrimIn,
        )}
        onClick={closeExport}
      ></div>
      <div
        className={joinClassNames(
          styles.modal,
          layer,
          shared.layerPanel,
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
  );
};
