import { ImageIcon, Sparkles } from "lucide-react";
import { SearchSelect } from "../../../../components/search-select/search-select";
import { joinClassNames } from "../../../../utils/class-names";
import { Swatches } from "../catalog-sheets";
import type { WizardForm } from "./use-wizard-form";
import type { WizardView } from "./view";
import parts from "../../../../styles/features/studio/services/wizard/parts.module.css";
import styles from "../../../../styles/features/studio/services/wizard/details-step.module.css";

interface DetailsStepProps {
  view: WizardView;
  form: WizardForm;
}

/** Step 2: name, description, category, service type and images. */
export const DetailsStep = ({ view, form }: DetailsStepProps) => {
  const { errors } = form.formState;
  const { draft, newCategory } = view;

  return (
    <div className={styles.stack12}>
      {view.isAdd && (
        <div className={styles.suggest}>
          <button
            className={styles.suggestButton}
            type="button"
            onClick={view.openSuggestions}
          >
            <Sparkles size={17} strokeWidth={1.7} />
            Suggested services
          </button>
          <div className={styles.suggestHint}>
            Pick one to fill this form in, then edit anything you like.
          </div>
        </div>
      )}
      <label className={parts.block}>
        <span className={parts.fieldLabel}>Service name</span>
        <input
          className={joinClassNames(
            styles.input,
            view.flash.name && parts.flash,
          )}
          data-flash="1"
          value={draft.name}
          onChange={view.onName}
          placeholder="e.g. Knotless braids"
          aria-invalid={errors.name ? "true" : "false"}
        />
      </label>
      {errors.name && (
        <div className={parts.varError} role="alert">
          {errors.name.message}
        </div>
      )}
      <label className={parts.block}>
        <span className={parts.fieldLabel}>
          Description <span className={styles.optionalGrey}>(optional)</span>
        </span>
        <textarea
          className={joinClassNames(
            styles.textarea,
            view.flash.description && parts.flash,
          )}
          data-flash="1"
          value={draft.description}
          onChange={view.onDescription}
          rows={3}
          placeholder="What's included, how to come prepared, etc."
        ></textarea>
      </label>
      <div className={styles.detailGrid}>
        <div>
          <span className={parts.fieldLabel}>
            Category <span className={styles.optional}>(optional)</span>
          </span>
          <SearchSelect
            options={view.categoryOptions}
            value={view.categoryValue}
            placeholder="No category"
            onChange={view.pickCategory}
          />
          {newCategory && (
            <div className={styles.newCat}>
              <label className={styles.field6}>
                <span className={styles.label135Strong}>New category</span>
                <input
                  className={joinClassNames(
                    styles.catInput,
                    !!newCategory.error && styles.catInputError,
                  )}
                  value={newCategory.name}
                  onChange={view.onNewCategoryName}
                  maxLength={40}
                  placeholder="e.g. Kids"
                  aria-invalid={newCategory.error ? "true" : "false"}
                />
                {!!newCategory.error && (
                  <span className={styles.error} role="alert">
                    {newCategory.error}
                  </span>
                )}
              </label>
              <Swatches swatches={view.newCategorySwatches} />
              <div className={styles.row8}>
                <button
                  className={styles.darkSmall}
                  type="button"
                  onClick={view.addNewCategory}
                >
                  Add category
                </button>
                <button
                  className={styles.cancelSmall}
                  type="button"
                  onClick={view.cancelNewCategory}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        <div className={styles.relative}>
          <span className={styles.typeHead}>
            <span className={styles.label135}>Service type</span>
            <button
              className={styles.help}
              type="button"
              onClick={view.toggleSubcategoryTip}
              onMouseEnter={view.showSubcategoryTip}
              onMouseLeave={view.hideSubcategoryTip}
              onFocus={view.showSubcategoryTip}
              onBlur={view.hideSubcategoryTip}
              aria-label="What is service type used for?"
            >
              ?
            </button>
          </span>
          <div
            className={joinClassNames(
              styles.typeBox,
              view.flash.type && parts.flash,
            )}
            data-flash="1"
          >
            <SearchSelect
              options={view.typeOptions}
              value={view.typeValue}
              placeholder="Search service types"
              onChange={view.pickType}
            />
          </div>
          {errors.typeId && (
            <div className={parts.varError} role="alert">
              {errors.typeId.message}
            </div>
          )}
          {view.isSubcategoryTipOpen && (
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
            <div className={styles.subTip} onClick={view.toggleSubcategoryTip}>
              Select the service type that best describes this service. This
              helps clients discover your service
            </div>
          )}
        </div>
      </div>
      <div>
        <span className={parts.fieldLabel}>
          Images <span className={styles.optional}>(optional)</span>
        </span>
        <div className={styles.images}>
          <ImageIcon
            className={parts.block}
            size={22}
            strokeWidth={1.8}
            color="var(--text-primary)"
          />
          <span className={styles.imagesTitle}>Add your images here</span>
          <button className={styles.chooseFile} onClick={view.pickImages}>
            Choose a file
          </button>
        </div>
        <div className={styles.fileTypes}>
          File type .jpg, .png, .avif, .webp · max size 45mb
        </div>
      </div>
    </div>
  );
};
