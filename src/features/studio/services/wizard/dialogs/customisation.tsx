import { X } from "lucide-react";
import { joinClassNames } from "../../../../../utils/class-names";
import {
  getDialogPlacement,
  getOverlayAnimation,
} from "../../../shell/overlay";
import type { WizardView } from "../view";
import shared from "../../../../../styles/features/studio/services/wizard/dialogs/index.module.css";
import styles from "../../../../../styles/features/studio/services/wizard/dialogs/customisation.module.css";

const OWN_MINUTES = ["0", "5", "10", "15", "20", "30", "45", "60", "90", "120"];

export interface CustomisationDialogProps {
  view: WizardView;
}

/** Add or edit one of the service's own customisations. */
export const CustomisationDialog = ({ view }: CustomisationDialogProps) => {
  const { own, isWide } = view;
  const { editor } = own;

  if (!editor) return null;

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className={shared.scrim70} onClick={own.cancel}></div>
      <div
        className={joinClassNames(
          styles.own,
          getDialogPlacement(isWide),
          getOverlayAnimation(false, "dialog", isWide),
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="own-dlg-title"
        onKeyDown={own.onKey}
        data-screen-label="Customisation dialog"
      >
        <div className={styles.ownTitle} id="own-dlg-title">
          {own.title}
        </div>
        <label className={styles.field6}>
          <span className={styles.label135}>Name</span>
          <input
            className={styles.nameInput}
            value={editor.name}
            // the dialog opens to type a name straight away
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            onChange={own.onName}
            placeholder="e.g. Service type"
          />
        </label>
        <div className={styles.optionsHead}>
          <span>Option</span>
          <span></span>
          <span>£</span>
          <span>Time</span>
          <span></span>
        </div>
        {own.options.map((option, index) => (
          <div key={option.key}>
            <div className={styles.optionRow}>
              <input
                className={styles.optionInput}
                value={option.label}
                onChange={option.onLabel}
                placeholder={`e.g. ${index === 0 ? "install" : index === 1 ? "refresh" : ""}`}
                aria-label="Option name"
              />
              <button
                className={joinClassNames(
                  styles.sign,
                  option.isNegativeValue && styles.signNeg,
                )}
                type="button"
                onClick={option.flip}
                aria-label={option.signAria}
                onMouseEnter={option.tipSign}
                onFocus={option.tipSign}
                onMouseLeave={view.hideSubcategoryTip}
                onBlur={view.hideSubcategoryTip}
              >
                {option.signText}
              </button>
              <input
                className={styles.optionPrice}
                value={option.price}
                onFocus={view.selectAll}
                onBlur={option.blur}
                onChange={option.onPrice}
                inputMode="decimal"
                aria-label={option.priceAria}
              />
              <select
                className={styles.optionTime}
                value={option.minutes}
                onChange={option.onMinutes}
                onBlur={option.blur}
                aria-label={option.minutesAria}
              >
                {OWN_MINUTES.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes}
                  </option>
                ))}
              </select>
              {option.canRemove && (
                <button
                  className={styles.removeOption}
                  type="button"
                  onClick={option.remove}
                  aria-label="Remove option"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>
            <div aria-live="polite">
              {[
                { key: "price", error: option.priceError },
                { key: "time", error: option.timeError },
              ].map(
                ({ key, error }) =>
                  !!error && (
                    <div key={key} className={styles.optionError} role="alert">
                      {error}
                    </div>
                  ),
              )}
            </div>
          </div>
        ))}
        <button
          className={styles.addOption}
          type="button"
          onClick={own.addOption}
        >
          + Add an option
        </button>
        {!!own.error && (
          <div className={styles.error} role="alert">
            {own.error}
          </div>
        )}
        <div className={styles.ownActions}>
          <button
            className={styles.ownCancel}
            type="button"
            onClick={own.cancel}
          >
            Cancel
          </button>
          <button className={styles.ownSave} type="button" onClick={own.save}>
            Save
          </button>
        </div>
      </div>
    </>
  );
};
