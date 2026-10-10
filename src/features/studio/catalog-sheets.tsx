import type { CSSProperties } from "react";
import { SearchSelect } from "../../components/search-select/search-select";
import { joinClassNames } from "../../utils/class-names";
import { DUR_HOUR_OPTIONS, DUR_MINUTE_OPTIONS } from "./catalog-sheets-view";
import type {
  AddonSheetView,
  CategoriesView,
  Swatch,
} from "./catalog-sheets-view";
import type { StudioController } from "./use-studio";
import styles from "./catalog-sheets.module.css";

const asStyle = (values: Record<string, string>) => values as CSSProperties;

const Chevron = ({ d }: { d: string }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d}></path>
  </svg>
);

/** The category colour radio group (prototype swatches). */
export const Swatches = ({ swatches }: { swatches: Swatch[] }) => (
  <div
    className={styles.swatches}
    role="radiogroup"
    aria-label="Category colour"
  >
    {swatches.map(({ key, name, bg, isOn, ring, pick }) => (
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
        style={asStyle({ "--swatch-bg": bg, "--swatch-ring": ring })}
      >
        {isOn && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5"></path>
          </svg>
        )}
      </button>
    ))}
  </div>
);

/** Manage categories (prototype shCats). */
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
                  row.isUpOff && styles.iconOff,
                )}
                type="button"
                onClick={row.up}
                disabled={row.isUpOff}
                aria-label={"Move " + row.name + " up"}
              >
                <Chevron d="m6 15 6-6 6 6" />
              </button>
              <button
                className={joinClassNames(
                  styles.iconButton,
                  row.isDownOff && styles.iconOff,
                )}
                type="button"
                onClick={row.down}
                disabled={row.isDownOff}
                aria-label={"Move " + row.name + " down"}
              >
                <Chevron d="m6 9 6 6 6-6" />
              </button>
              <button className={styles.edit} type="button" onClick={row.edit}>
                Edit
              </button>
              <button
                className={styles.delete}
                type="button"
                onClick={row.remove}
                aria-label={"Delete " + row.name}
              >
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
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"></path>
                </svg>
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
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <path d="M12 5v14M5 12h14"></path>
        </svg>
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

/** Create or edit an add-on (prototype shAddon). */
export const AddonSheet = ({ view }: { view: AddonSheetView }) => {
  const { newCat } = view;
  return (
    <div className={styles.addon}>
      <label className={styles.block}>
        <span className={styles.fieldLabel}>Name</span>
        <input
          className={styles.input}
          value={view.name}
          onChange={view.onName}
          placeholder="e.g. Beads"
        />
      </label>
      <div>
        <span className={styles.fieldLabel}>
          Category <span className={styles.optional}>(optional)</span>
        </span>
        <SearchSelect
          options={view.catOptions}
          value={view.catValue}
          placeholder="No category"
          onChange={view.pickCat}
        />
        {newCat && (
          <div className={styles.newCat}>
            <label className={styles.field}>
              <span className={styles.label135Strong}>New category</span>
              <input
                className={joinClassNames(
                  styles.nameInput,
                  !!newCat.err && styles.nameInputError,
                )}
                value={newCat.name}
                onChange={view.onNewCatName}
                maxLength={40}
                placeholder="e.g. Kids"
                aria-invalid={newCat.err ? "true" : "false"}
              />
              {!!newCat.err && (
                <span className={styles.error} role="alert">
                  {newCat.err}
                </span>
              )}
            </label>
            <Swatches swatches={view.newCatSwatches} />
            <div className={styles.buttons}>
              <button
                className={styles.smallDark}
                type="button"
                onClick={view.addNewCat}
              >
                Add category
              </button>
              <button
                className={styles.smallCancel}
                type="button"
                onClick={view.cancelNewCat}
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
              {DUR_HOUR_OPTIONS.map(({ v, label }) => (
                <option key={v} value={v}>
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
              {DUR_MINUTE_OPTIONS.map(({ v, label }) => (
                <option key={v} value={v}>
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

/** Create / Save add-on (prototype shAddon footer). */
export const AddonSheetFooter = ({ view }: { view: AddonSheetView }) => (
  <div className={styles.footer}>
    <button
      className={joinClassNames(
        styles.saveAddon,
        view.isDisabled && styles.faded,
      )}
      onClick={view.save}
      disabled={view.isDisabled}
    >
      {view.cta}
    </button>
  </div>
);
