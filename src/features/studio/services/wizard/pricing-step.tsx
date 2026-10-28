import type { FocusEvent } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { joinClassNames } from "../../../../utils/class-names";
import { VariationCard } from "./parts";
import type { WizardForm } from "./use-wizard-form";
import type { WizardView } from "./view";
import parts from "../../../../styles/features/studio/services/wizard/parts.module.css";
import styles from "../../../../styles/features/studio/services/wizard/pricing-step.module.css";

interface PricingStepProps {
  view: WizardView;
  form: WizardForm;
}

/** Step 3: base price and time, size / length options and own customisations. */
export const PricingStep = ({ view, form }: PricingStepProps) => {
  const { draft, own } = view;
  const { errors } = form.formState;

  const checkDurationOnLeave = ({
    currentTarget,
    relatedTarget,
  }: FocusEvent<HTMLDivElement>) => {
    if (!currentTarget.contains(relatedTarget))
      void form.trigger("durationHours");
  };

  const baseErrors = [
    errors.price?.message,
    errors.durationHours?.message,
  ].filter((message) => !!message);

  return (
    <>
      <>
        <div className={styles.sectionTitle}>Base price &amp; duration</div>
        <div className={styles.baseBox}>
          <div className={styles.stack16}>
            <label className={parts.block}>
              <span className={parts.fieldLabel}>Price</span>
              <span
                className={joinClassNames(
                  styles.priceBox,
                  view.flash.price && parts.flash,
                )}
                data-flash="1"
              >
                <span className={styles.pound}>£</span>
                <input
                  className={styles.priceInput}
                  value={draft.price}
                  onChange={view.onPrice}
                  onBlur={() => void form.trigger("price")}
                  inputMode="decimal"
                  placeholder="0"
                  aria-label="Base price"
                />
              </span>
            </label>
            <div>
              <span className={parts.fieldLabel}>Duration</span>
              <div
                className={joinClassNames(
                  styles.durationGrid,
                  view.flash.price && parts.flash,
                )}
                data-flash="1"
                onBlur={checkDurationOnLeave}
              >
                <span className={styles.selectWrap}>
                  <select
                    className={styles.select}
                    value={view.durationHourValue}
                    onChange={view.onDurationHours}
                    aria-label="Hours"
                  >
                    {view.hourOptions.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className={styles.selectChevron}
                    size={16}
                    strokeWidth={1.7}
                  />
                </span>
                <span className={styles.selectWrap}>
                  <select
                    className={styles.select}
                    value={view.durationMinuteValue}
                    onChange={view.onDurationMinutes}
                    aria-label="Minutes"
                  >
                    {view.minuteOptions.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className={styles.selectChevron}
                    size={16}
                    strokeWidth={1.7}
                  />
                </span>
              </div>
            </div>
            <label className={parts.block}>
              <span className={parts.fieldLabel}>Extra time after</span>
              <span className={styles.selectWrap}>
                <select
                  className={joinClassNames(
                    styles.extraSelect,
                    view.isExtraTyped && styles.extraTyped,
                  )}
                  value={view.extraValue}
                  onChange={view.onExtra}
                  aria-label="Extra time after"
                >
                  {view.extraOptions.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className={styles.selectChevron}
                  size={16}
                  strokeWidth={1.7}
                />
              </span>
              <span className={styles.extraNote}>
                Blocked out for clean-down.
              </span>
              {view.isExtraOverride && (
                <span className={styles.extraHelp}>{view.extraHelp}</span>
              )}
            </label>
          </div>
        </div>
      </>
      {baseErrors.map((message) => (
        <div key={message} className={parts.varError} role="alert">
          {message}
        </div>
      ))}
      {view.hasPlatform && (
        <div className={styles.customTitle}>Customisations</div>
      )}
      {view.hasSizes && (
        <VariationCard
          view={view}
          title="Add size options"
          subtitle="Adjust price and time by size, click to edit."
          aria="Toggle size options"
          head={view.sizeHead}
          isOn={draft.sizesOn}
          toggle={view.toggleSizes}
          rows={view.sizeRows}
        />
      )}
      {view.hasLengths && (
        <VariationCard
          view={view}
          title="Add length options"
          subtitle="Adjust price and time by hair length, click to edit."
          aria="Toggle length options"
          head="Length"
          isOn={draft.lengthsOn}
          toggle={view.toggleLengths}
          rows={view.lengthRows}
          isNext
        />
      )}
      <div className={styles.own} data-screen-label="Your own customisations">
        <div className={styles.ownTitle}>Your own customisations</div>
        <div className={styles.ownIntro}>
          Choices clients pick from when they book, like parting. Each option
          can add to the price or time.
        </div>
        {own.rows.map(({ key, name, meta, error, edit, remove }) => (
          <div key={key}>
            <div className={styles.ownRow}>
              <span className={parts.grow}>
                <span className={styles.ownName}>{name}</span>
                <span className={styles.ownMeta}>{meta}</span>
              </span>
              <button className={styles.ownEdit} type="button" onClick={edit}>
                Edit
              </button>
              <button
                className={styles.ownDelete}
                type="button"
                onClick={remove}
              >
                Delete
              </button>
            </div>
            {!!error && (
              <div className={parts.varError} role="alert">
                {error}
              </div>
            )}
          </div>
        ))}
        {!own.editor && (
          <button
            className={styles.ownAdd}
            type="button"
            onClick={own.startNew}
          >
            <Plus size={14} strokeWidth={2.2} />
            Add a customisation
          </button>
        )}
      </div>
      {view.isReviewShown && (
        <button
          className={joinClassNames(
            styles.reviewButton,
            !view.isReviewReady && styles.reviewOff,
          )}
          onClick={view.openReview}
        >
          Review your prices
        </button>
      )}
    </>
  );
};
