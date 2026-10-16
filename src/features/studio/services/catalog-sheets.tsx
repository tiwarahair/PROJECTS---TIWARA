import type { AddonForm } from "./use-addon-form";
import type { CSSProperties } from "react";
import { Check, ChevronDown, ChevronUp, Plus, Trash } from "lucide-react";
import { SearchSelect } from "../../../components/search-select/search-select";
import { joinClassNames } from "../../../utils/class-names";
import {
  DURATION_HOUR_OPTIONS,
  DURATION_MINUTE_OPTIONS,
} from "./catalog-sheets-view";
import type {
  AddonSheetView,
  CategoriesView,
  Swatch,
} from "./catalog-sheets-view";
import type { StudioController } from "../core/use-studio";
import styles from "../../../styles/features/studio/services/catalog-sheets.module.css";

const asStyle = (values: Record<string, string>) => values as CSSProperties;

/** The category colour radio group. */
export const Swatches = ({ swatches }: { swatches: Swatch[] }) => (
  <div
    className={styles.swatches}
    role="radiogroup"
    aria-label="Category colour"
  >
    {swatches.map(({ key, name, background, isOn, ring, pick }) => (
      <button
        key={key}
        className={styles.swatch}
        type="button"
        role="radio"
        aria-checked={isOn ? "true" : "false"}
        aria-label={name}
        title={name}
        onClick={pick}
        // runtime: each swatch is its own colour, ringed when picked
        style={asStyle({ "--swatch-bg": background, "--swatch-ring": ring })}
      >
        {isOn && <Check size={14} strokeWidth={3} color="#fff" />}
      </button>
    ))}
  </div>
);

/** Manage categories. */
export const CategoriesSheet = ({
  studio,
  view,
}: {
  studio: StudioController;
  view: CategoriesView;
}) => (
  <div className={styles.cats} data-screen-label="Manage categories">
    <p className={styles.intro}>
      Group your menu the way you want clients to see it. Colours are only for
      you, on your calendar and services.
    </p>
    <div className={styles.column}>
      {view.rows.map((row) => (
        <div key={row.key} className={styles.row}>
          {!row.isEditing && (
            <div className={styles.rowView}>
              <span
                className={styles.dot}
                aria-hidden="true"
                // runtime: the category's colour
                style={asStyle({ "--dot": row.dot })}
              ></span>
              <span className={styles.grow}>
                <span className={styles.name}>{row.name}</span>
                <span className={styles.meta}>{row.meta}</span>
              </span>
              <button
                className={joinClassNames(
                  styles.iconButton,
                  row.isMoveUpDisabled && styles.iconOff,
                )}
                type="button"
                onClick={row.moveUp}
                disabled={row.isMoveUpDisabled}
                aria-label={`Move ${row.name} up`}
              >
                <ChevronUp size={16} strokeWidth={1.8} />
              </button>
              <button
                className={joinClassNames(
                  styles.iconButton,
                  row.isMoveDownDisabled && styles.iconOff,
                )}
                type="button"
                onClick={row.down}
                disabled={row.isMoveDownDisabled}
                aria-label={`Move ${row.name} down`}
              >
                <ChevronDown size={16} strokeWidth={1.8} />
              </button>
              <button className={styles.edit} type="button" onClick={row.edit}>
                Edit
              </button>
              <button
                className={styles.delete}
                type="button"
                onClick={row.remove}
                aria-label={`Delete ${row.name}`}
              >
                <Trash size={16} strokeWidth={1.7} />
              </button>
            </div>
          )}
          {row.isEditing && (
            <div className={styles.editor}>
              <label className={styles.field}>
                <span className={styles.label135}>Name</span>
                <input
                  className={joinClassNames(
                    styles.nameInput,
                    !!row.editError && styles.nameInputError,
                  )}
                  value={row.editName}
                  onChange={row.onEditName}
                  maxLength={40}
                  aria-invalid={row.editError ? "true" : "false"}
                />
                {!!row.editError && (
                  <span className={styles.error} role="alert">
                    {row.editError}
                  </span>
                )}
              </label>
              <div className={styles.label135}>Colour</div>
              <Swatches swatches={row.swatches} />
              <div className={styles.buttons}>
                <button
                  className={styles.save}
                  type="button"
                  onClick={row.save}
                >
                  Save
                </button>
                <button
                  className={styles.cancel}
                  type="button"
                  onClick={row.cancel}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
      {view.isEmpty && (
        <div className={styles.empty}>
          No categories yet. Your services show as one list.
        </div>
      )}
    </div>
    <div className={styles.newBox}>
      <label className={styles.field}>
        <span className={styles.label145}>New category</span>
        <input
          className={joinClassNames(
            styles.nameInput,
            !!view.newError && styles.nameInputError,
          )}
          value={view.newName}
          onChange={view.onNewName}
          maxLength={40}
          placeholder="e.g. Kids"
          aria-invalid={view.newError ? "true" : "false"}
        />
        {!!view.newError && (
          <div className={styles.error} role="alert">
            {view.newError}
          </div>
        )}
      </label>
      <div className={styles.label135}>Colour</div>
      <Swatches swatches={view.newSwatches} />
      <button className={styles.addCategory} type="button" onClick={view.add}>
        <Plus size={14} strokeWidth={2.2} />
        Add category
      </button>
    </div>
    <button
      className={styles.done}
      type="button"
      onClick={studio.actions.closeSheet}
    >
      Done
    </button>
  </div>
);

/** Create or edit an add-on. */
interface AddonSheetProps {
  view: AddonSheetView;
  form: AddonForm;
}

export const AddonSheet = ({ view, form }: AddonSheetProps) => {
  const { newCategory } = view;
  const nameError = form.formState.errors.name?.message;

  return (
    <div className={styles.addon}>
      <label className={styles.block}>
        <span className={styles.fieldLabel}>Name</span>
        <input
          className={styles.input}
          value={view.name}
          onChange={view.onName}
          placeholder="e.g. Beads"
          aria-invalid={nameError ? "true" : "false"}
        />
        {nameError && (
          <span className={styles.error} role="alert">
            {nameError}
          </span>
        )}
      </label>
      <div>
        <span className={styles.fieldLabel}>
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
            <label className={styles.field}>
              <span className={styles.label135Strong}>New category</span>
              <input
                className={joinClassNames(
                  styles.nameInput,
                  !!newCategory.error && styles.nameInputError,
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
            <div className={styles.buttons}>
              <button
                className={styles.smallDark}
                type="button"
                onClick={view.addNewCategory}
              >
                Add category
              </button>
              <button
                className={styles.smallCancel}
                type="button"
                onClick={view.cancelNewCategory}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      <div className={styles.priceTime}>
        <label className={styles.block}>
          <span className={styles.fieldLabel}>Added price</span>
          <span className={styles.inline}>
            <span className={styles.prefix}>+£</span>
            <input
              className={styles.priceInput}
              value={view.price}
              onChange={view.onPrice}
              inputMode="decimal"
              placeholder="0"
            />
          </span>
        </label>
        <label className={styles.block}>
          <span className={styles.fieldLabel}>Added time</span>
          <span className={styles.inline}>
            <span className={styles.prefix}>+</span>
            <select
              className={styles.select}
              value={view.hourValue}
              onChange={view.onHour}
              aria-label="Hours"
            >
              {DURATION_HOUR_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              className={styles.select}
              value={view.minuteValue}
              onChange={view.onMinute}
              aria-label="Minutes"
            >
              {DURATION_MINUTE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </span>
        </label>
      </div>
    </div>
  );
};

/** Create / Save add-on. */
export const AddonSheetFooter = ({ view, form }: AddonSheetProps) => (
  <div className={styles.footer}>
    <button
      className={styles.saveAddon}
      onClick={() => void form.handleSubmit(view.save)()}
    >
      {view.cta}
    </button>
  </div>
);
