import { joinClassNames } from "../../../../utils/class-names";
import type { WizardView } from "./view";
import styles from "../../../../styles/features/studio/services/wizard/parts.module.css";

type VariationRow = WizardView["sizeRows"][number];

interface VariationCardProps {
  view: WizardView;
  title: string;
  subtitle: string;
  aria: string;
  head: string;
  isOn: boolean;
  toggle: () => void;
  rows: VariationRow[];
  isNext?: boolean;
}

/** A size or length option card. */
export const VariationCard = ({
  view,
  title,
  subtitle,
  aria,
  head,
  isOn,
  toggle,
  rows,
  isNext,
}: VariationCardProps) => (
  <div
    className={joinClassNames(
      styles.optionCard,
      isNext && styles.optionCardNext,
      view.flash.options && styles.flash,
    )}
    data-flash="1"
  >
    <div className={styles.toggleRow}>
      <div className={styles.grow}>
        <div className={styles.title15}>{title}</div>
        <div className={styles.sub135}>{subtitle}</div>
      </div>
      <button
        className={joinClassNames(styles.switch, isOn && styles.switchOn)}
        onClick={toggle}
        aria-label={aria}
      >
        <span className={styles.knob}></span>
      </button>
    </div>
    <div className={joinClassNames(styles.reveal, isOn && styles.revealOpen)}>
      <div className={styles.revealInner}>
        <div className={styles.chips} role="group" aria-label={head}>
          {rows.map((row) => {
            const error = row.isOn && (row.priceError || row.timeError);

            return (
              <button
                key={row.key}
                type="button"
                className={joinClassNames(
                  styles.chip,
                  row.isOn ? styles.chipOn : styles.chipOff,
                  !!error && styles.chipError,
                )}
                onClick={row.open}
                aria-haspopup="dialog"
                aria-label={[row.label, row.deltaText, error || ""]
                  .filter(Boolean)
                  .join(", ")}
                disabled={!isOn}
              >
                {row.label}
                {!!row.deltaText && (
                  <span className={styles.chipDelta}>{row.deltaText}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  </div>
);
