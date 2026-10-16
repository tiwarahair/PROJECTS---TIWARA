import { Check } from "lucide-react";
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
        <div className={styles.varHead}>
          <div className={styles.varHeadLabel}>{head}</div>
          <div className={styles.varHeadPrice}>Price</div>
          <div
            className={joinClassNames(
              styles.varHeadDuration,
              view.isWide && styles.durGap,
            )}
          >
            Duration
          </div>
          <div className={styles.varHeadEnd}></div>
        </div>
        {rows.map((row) => {
          const fade = !row.isOn && styles.faded;

          return (
            <div key={row.key} className={styles.varRowWrap}>
              <div
                className={joinClassNames(
                  styles.varRow,
                  row.isOn && styles.varRowOn,
                )}
              >
                <div className={joinClassNames(styles.varLabel, fade)}>
                  {row.label}
                </div>
                <button
                  className={joinClassNames(
                    styles.sign,
                    row.isOn && styles.signActive,
                    row.isNegativeValue && styles.signNeg,
                    fade,
                  )}
                  type="button"
                  onClick={row.flip}
                  disabled={!row.isOn}
                  aria-label={row.signAria}
                  onMouseEnter={row.tipSign}
                  onFocus={row.tipSign}
                  onMouseLeave={view.hideSubcategoryTip}
                  onBlur={view.hideSubcategoryTip}
                >
                  {row.signText}
                </button>
                <span className={joinClassNames(styles.muted135, fade)}>£</span>
                <input
                  className={joinClassNames(styles.varPrice, fade)}
                  value={row.price}
                  onChange={row.setPrice}
                  onFocus={view.selectAll}
                  onBlur={row.blur}
                  disabled={!row.isOn}
                  inputMode="decimal"
                  aria-label={`${row.label} price in pounds`}
                />
                <input
                  className={joinClassNames(
                    styles.varTime,
                    view.isWide && styles.durGap,
                    fade,
                  )}
                  value={row.hours}
                  onChange={row.setHours}
                  onFocus={view.selectAll}
                  onBlur={row.blur}
                  disabled={!row.isOn}
                  inputMode="decimal"
                  aria-label={`${row.label} hours`}
                />
                <span className={joinClassNames(styles.unit, fade)}>hr</span>
                <input
                  className={joinClassNames(styles.varTime, fade)}
                  value={row.minutes}
                  onChange={row.setMinutes}
                  onFocus={view.selectAll}
                  onBlur={row.blur}
                  disabled={!row.isOn}
                  inputMode="decimal"
                  aria-label={`${row.label} minutes`}
                />
                <span className={joinClassNames(styles.unit, fade)}>min</span>
                <button
                  className={joinClassNames(
                    styles.check,
                    row.isOn && styles.checkOn,
                  )}
                  type="button"
                  onClick={row.toggle}
                  aria-label={`Offer ${row.label}`}
                  aria-pressed={row.isOn ? "true" : "false"}
                  onMouseEnter={row.tipCheck}
                  onFocus={row.tipCheck}
                  onMouseLeave={view.hideSubcategoryTip}
                  onBlur={view.hideSubcategoryTip}
                >
                  {row.isOn && <Check size={11} strokeWidth={3} color="#fff" />}
                </button>
              </div>
              <div aria-live="polite">
                {!!row.priceError && (
                  <div className={styles.varError} role="alert">
                    {row.priceError}
                  </div>
                )}
                {!!row.timeError && (
                  <div className={styles.varError} role="alert">
                    {row.timeError}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);
