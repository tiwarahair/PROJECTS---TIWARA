import { ChevronRight, Search, X } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import {
  DURATION_HOUR_OPTIONS,
  DURATION_MINUTE_OPTIONS,
} from "./catalog-sheets-view";
import { getDialogPlacement, getOverlayAnimation } from "./studio-overlay";
import type { StudioController } from "./use-studio";
import { getWizardView } from "./wizard-view";
import type { WizardView } from "./wizard-view";
import styles from "../../styles/features/studio/wizard-dialogs.module.css";

const OWN_MINUTES = ["0", "5", "10", "15", "20", "30", "45", "60", "90", "120"];

/** Quick-create an add-on from the wizard's Add-ons step. */
const NewAddonDialog = ({ view }: { view: WizardView }) => {
  const { addons, isWide } = view;
  const draft = addons.newAddon;

  if (!draft) return null;

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className={styles.scrim80} onClick={addons.cancelNew}></div>
      <div className={joinClassNames(styles.addon, isWide && styles.addonWide)}>
        <div className={styles.head}>
          <div className={styles.grow}>
            <div className={styles.title}>New add-on</div>
          </div>
          <button
            className={styles.close}
            onClick={addons.cancelNew}
            aria-label="Close"
          >
            <X size={19} strokeWidth={2} />
          </button>
        </div>
        <div className={styles.stack12}>
          <label className={styles.block}>
            <span className={styles.fieldLabel}>Name</span>
            <input
              className={styles.input}
              value={draft.name}
              onChange={(event) =>
                addons.patchNew({ name: event.target.value })
              }
              placeholder="e.g. Beads"
            />
          </label>
          <label className={styles.block}>
            <span className={styles.fieldLabel}>Category</span>
            <select
              className={styles.select}
              value={addons.newCategory}
              onChange={(event) =>
                addons.patchNew({
                  categoryId:
                    event.target.value === "none" ? null : event.target.value,
                })
              }
            >
              {addons.newCategoryOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.priceTime}>
            <label className={styles.block}>
              <span className={styles.fieldLabel}>Added price</span>
              <span className={styles.inline5}>
                <span className={styles.prefix}>+£</span>
                <input
                  className={styles.priceInput}
                  value={draft.price}
                  onChange={(event) =>
                    addons.patchNew({ price: event.target.value })
                  }
                  inputMode="decimal"
                  placeholder="0"
                />
              </span>
            </label>
            <label className={styles.block}>
              <span className={styles.fieldLabel}>Added time</span>
              <span className={styles.inline6}>
                <select
                  className={styles.timeSelect}
                  value={addons.newHour}
                  onChange={(event) =>
                    addons.patchNew({ hours: event.target.value })
                  }
                  aria-label="Hours"
                >
                  {DURATION_HOUR_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  className={styles.timeSelect}
                  value={addons.newMinute}
                  onChange={(event) =>
                    addons.patchNew({ min: event.target.value })
                  }
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
        <div className={styles.actions}>
          <button className={styles.cancel} onClick={addons.cancelNew}>
            Cancel
          </button>
          <button className={styles.create} onClick={addons.createNew}>
            Create add-on
          </button>
        </div>
      </div>
    </>
  );
};

/** Suggested services: search the platform's service types. */
const SuggestionsDialog = ({ view }: { view: WizardView }) => {
  if (!view.isSuggestionsOpen) return null;

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className={styles.scrim70} onClick={view.closeSuggestions}></div>
      <div
        className={joinClassNames(
          styles.sugg,
          view.isWide && styles.suggWide,
          getOverlayAnimation(false, "dialog", view.isWide),
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sugg-title"
        onKeyDown={view.suggestionKey}
        data-screen-label="Suggested services"
      >
        <div className={styles.suggHead}>
          <h2 className={styles.h2} id="sugg-title">
            Suggested services
          </h2>
          <button
            className={styles.closeRound}
            type="button"
            onClick={view.closeSuggestions}
            aria-label="Close"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        <div className={styles.suggBody}>
          <div className={styles.searchWrap}>
            <Search
              className={styles.searchIcon}
              size={16}
              strokeWidth={1.8}
              color="var(--text-secondary)"
            />
            <input
              className={joinClassNames(
                styles.search,
                view.isSearching && styles.searchActive,
              )}
              value={view.search}
              aria-label="Search suggested services"
              onChange={view.onSearch}
              placeholder="Search braids, locs, silk press…"
            />
            {view.isSearching && (
              <button
                className={styles.clear}
                onClick={view.clearSearch}
                aria-label="Clear search"
              >
                <X size={14} strokeWidth={2.2} />
              </button>
            )}
          </div>
          <div className={styles.chips}>
            {view.categoryChips.map(({ key, label, isOn, pick }) => (
              <button
                key={key}
                className={joinClassNames(styles.chip, isOn && styles.chipOn)}
                onClick={pick}
              >
                {label}
              </button>
            ))}
          </div>
          {view.catalogue.map(({ key, category, items }) => (
            <div key={key} className={styles.group}>
              <div className={styles.groupTitle}>{category}</div>
              {items.map((item) => (
                <button
                  key={item.key}
                  className={styles.item}
                  onClick={item.pick}
                >
                  <span className={styles.itemName}>{item.name}</span>
                  <ChevronRight
                    className={styles.itemChevron}
                    size={15}
                    strokeWidth={2}
                    color="var(--text-secondary)"
                  />
                </button>
              ))}
            </div>
          ))}
          {view.hasNoResults && (
            <div className={styles.noResults}>
              <div className={styles.noResultsText}>
                {`No suggestions for ‘${view.search}’. Close this and fill the form in yourself.`}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

/** Add or edit one of the service's own customisations. */
const CustomisationDialog = ({ view }: { view: WizardView }) => {
  const { own, isWide } = view;
  const { editor } = own;

  if (!editor) return null;

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className={styles.scrim70} onClick={own.cancel}></div>
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
            placeholder="e.g. Parting"
          />
        </label>
        <div className={styles.optionsHead}>
          <span>Option</span>
          <span></span>
          <span>£</span>
          <span>Time</span>
          <span></span>
        </div>
        {own.options.map((option) => (
          <div key={option.key}>
            <div className={styles.optionRow}>
              <input
                className={styles.optionInput}
                value={option.label}
                onChange={option.onLabel}
                placeholder="e.g. Zig-zag"
                aria-label="Option name"
              />
              <button
                className={joinClassNames(
                  styles.sign,
                  option.isNegativeValue && styles.signNeg,
                )}
                type="button"
                onClick={option.flip}
                disabled={false}
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
              {!!option.priceError && (
                <div className={styles.optionError} role="alert">
                  {option.priceError}
                </div>
              )}
              {!!option.timeError && (
                <div className={styles.optionError} role="alert">
                  {option.timeError}
                </div>
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

/** The wizard's dialogs, rendered in order with the page's other dialogs. */
export const WizardNewAddonDialog = ({
  studio,
}: {
  studio: StudioController;
}) => {
  const view = getWizardView(studio);

  return view ? <NewAddonDialog view={view} /> : null;
};

export const WizardSuggestionDialogs = ({
  studio,
}: {
  studio: StudioController;
}) => {
  const view = getWizardView(studio);

  return view ? (
    <>
      <SuggestionsDialog view={view} />
      <CustomisationDialog view={view} />
    </>
  ) : null;
};
