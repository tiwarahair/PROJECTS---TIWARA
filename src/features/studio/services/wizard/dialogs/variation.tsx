import { useEffect, useRef } from "react";
import { ChevronDown, X } from "lucide-react";
import {
  getDialogPlacement,
  getOverlayAnimation,
} from "../../../../../components/overlay";
import { useFocusLoop } from "../../../../../hooks/use-focus-loop";
import { joinClassNames } from "../../../../../utils/class-names";
import type { WizardView } from "../view";
import shared from "../../../../../styles/features/studio/services/wizard/dialogs/index.module.css";
import own from "../../../../../styles/features/studio/services/wizard/dialogs/customisation.module.css";
import parts from "../../../../../styles/features/studio/services/wizard/parts.module.css";
import pricing from "../../../../../styles/features/studio/services/wizard/pricing-step.module.css";
import styles from "../../../../../styles/features/studio/services/wizard/dialogs/variation.module.css";

interface VariationDialogProps {
  view: WizardView;
}

/** Edit 1 size or length option */
export const VariationDialog = ({ view }: VariationDialogProps) => {
  const { variationSheet: sheet, isWide } = view;
  const boxRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);

  useFocusLoop(boxRef);

  const isOpen = !!sheet;

  // focus moves into the sheet, then back to the chip that opened it
  useEffect(() => {
    if (!isOpen) return;

    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    firstRef.current?.focus({ preventScroll: true });

    return () => opener?.focus({ preventScroll: true });
  }, [isOpen]);

  if (!sheet) return null;

  const errors = [sheet.priceError, sheet.timeError].filter(Boolean);

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className={shared.scrim70} onClick={sheet.cancel}></div>
      <div
        ref={boxRef}
        className={joinClassNames(
          own.own,
          styles.box,
          getDialogPlacement(isWide),
          getOverlayAnimation(false, "dialog", isWide),
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="variation-dlg-title"
        onKeyDown={sheet.onKey}
        data-screen-label="Option dialog"
      >
        <div className={styles.head}>
          <div className={own.ownTitle} id="variation-dlg-title">
            {sheet.label}
          </div>
          <button
            className={styles.close}
            type="button"
            onClick={sheet.cancel}
            aria-label="Close"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className={styles.offerRow}>
          <span className={own.label135}>{`Offer this ${sheet.word}`}</span>
          <button
            ref={firstRef}
            className={joinClassNames(
              parts.switch,
              sheet.isOn && parts.switchOn,
            )}
            type="button"
            role="switch"
            aria-checked={sheet.isOn ? "true" : "false"}
            onClick={sheet.toggle}
            aria-label={`Offer this ${sheet.word}`}
          >
            <span className={parts.knob}></span>
          </button>
        </div>
        <div className={styles.pair}>
          <label className={own.field6}>
            <span className={own.label135}>Name</span>
            <input
              className={joinClassNames(own.nameInput, styles.readOnly)}
              value={sheet.name}
              readOnly
              tabIndex={-1}
            />
          </label>
          <label className={own.field6}>
            <span className={own.label135}>Option</span>
            <input
              className={joinClassNames(own.nameInput, styles.readOnly)}
              value={sheet.label}
              readOnly
              tabIndex={-1}
            />
          </label>
        </div>
        <div
          className={joinClassNames(
            styles.adjust,
            !sheet.isOn && styles.adjustOff,
          )}
        >
          <span className={own.label135}>Price &amp; time</span>
          <div className={styles.priceRow}>
            <button
              className={joinClassNames(
                parts.sign,
                styles.sign,
                sheet.isOn && parts.signActive,
                sheet.isNegativeValue && parts.signNeg,
              )}
              type="button"
              onClick={sheet.flip}
              disabled={!sheet.isOn}
              aria-label={sheet.signAria}
              onMouseEnter={sheet.tipSign}
              onFocus={sheet.tipSign}
              onMouseLeave={view.hideSubcategoryTip}
              onBlur={view.hideSubcategoryTip}
            >
              {sheet.signText}
            </button>
            <span className={joinClassNames(pricing.priceBox, styles.price)}>
              <span className={pricing.pound}>£</span>
              <input
                className={pricing.priceInput}
                value={sheet.price}
                onChange={sheet.setPrice}
                onFocus={view.selectAll}
                onBlur={sheet.blur}
                disabled={!sheet.isOn}
                inputMode="decimal"
                aria-label={`${sheet.label} price in pounds`}
              />
            </span>
            <span className={pricing.selectWrap}>
              <select
                className={joinClassNames(pricing.select, styles.select)}
                value={sheet.hours}
                onChange={sheet.setHours}
                onBlur={sheet.blur}
                disabled={!sheet.isOn}
                aria-label={`${sheet.label} hours`}
              >
                {sheet.hourOptions.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className={joinClassNames(
                  pricing.selectChevron,
                  styles.chevron,
                )}
                size={16}
                strokeWidth={1.7}
              />
            </span>
            <span className={pricing.selectWrap}>
              <select
                className={joinClassNames(pricing.select, styles.select)}
                value={sheet.minutes}
                onChange={sheet.setMinutes}
                onBlur={sheet.blur}
                disabled={!sheet.isOn}
                aria-label={`${sheet.label} minutes`}
              >
                {sheet.minuteOptions.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className={joinClassNames(
                  pricing.selectChevron,
                  styles.chevron,
                )}
                size={16}
                strokeWidth={1.7}
              />
            </span>
          </div>
        </div>
        <div aria-live="polite">
          {errors.map((error) => (
            <div key={error} className={own.optionError} role="alert">
              {error}
            </div>
          ))}
        </div>
        <div className={own.ownActions}>
          <button
            className={own.ownCancel}
            type="button"
            onClick={sheet.cancel}
          >
            Cancel
          </button>
          <button
            className={own.ownSave}
            type="button"
            onClick={sheet.save}
            disabled={errors.length > 0}
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
};
