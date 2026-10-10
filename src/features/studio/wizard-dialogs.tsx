import { joinClassNames } from "../../utils/class-names";
import { DUR_HOUR_OPTIONS, DUR_MINUTE_OPTIONS } from "./catalog-sheets-view";
import { getDialogPlacement, getOverlayAnimation } from "./studio-overlay";
import type { StudioController } from "./use-studio";
import { getWizardView } from "./wizard-view";
import type { WizardView } from "./wizard-view";
import styles from "./wizard-dialogs.module.css";

const CloseIcon = ({
  size,
  strokeWidth,
}: {
  size: string;
  strokeWidth: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 6 6 18M6 6l12 12"></path>
  </svg>
);

const OWN_MINUTES = ["0", "5", "10", "15", "20", "30", "45", "60", "90", "120"];

/** Quick-create an add-on from the wizard's Add-ons step (prototype wizNewOpen). */
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
            <CloseIcon size="19" strokeWidth="2" />
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
              value={addons.newCat}
              onChange={(event) =>
                addons.patchNew({
                  categoryId:
                    event.target.value === "none" ? null : event.target.value,
                })
              }
            >
              {addons.newCatOptions.map(({ v, label }) => (
                <option key={v} value={v}>
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
                    addons.patchNew({ hr: event.target.value })
                  }
                  aria-label="Hours"
                >
                  {DUR_HOUR_OPTIONS.map(({ v, label }) => (
                    <option key={v} value={v}>
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

/** Suggested services: search the platform's service types (prototype wizSuggOn). */
const SuggestionsDialog = ({ view }: { view: WizardView }) => {
  if (!view.isSuggOpen) return null;
  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className={styles.scrim70} onClick={view.closeSugg}></div>
      <div
        className={joinClassNames(
          styles.sugg,
          view.isWide && styles.suggWide,
          getOverlayAnimation(false, "dlg", view.isWide),
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sugg-title"
        onKeyDown={view.suggKey}
        data-screen-label="Suggested services"
      >
        <div className={styles.suggHead}>
          <h2 className={styles.h2} id="sugg-title">
            Suggested services
          </h2>
          <button
            className={styles.closeRound}
            type="button"
            onClick={view.closeSugg}
            aria-label="Close"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div className={styles.suggBody}>
          <div className={styles.searchWrap}>
            <svg
              className={styles.searchIcon}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-secondary)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7"></circle>
              <path d="m20 20-3.5-3.5"></path>
            </svg>
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
                <CloseIcon size="14" strokeWidth="2.2" />
              </button>
            )}
          </div>
          <div className={styles.chips}>
            {view.catChips.map(({ key, label, isOn, pick }) => (
              <button
                key={key}
                className={joinClassNames(styles.chip, isOn && styles.chipOn)}
                onClick={pick}
              >
                {label}
              </button>
            ))}
          </div>
          {view.catalogue.map(({ key, cat, items }) => (
            <div key={key} className={styles.group}>
              <div className={styles.groupTitle}>{cat}</div>
              {items.map((item) => (
                <button
                  key={item.key}
                  className={styles.item}
                  onClick={item.pick}
                >
                  <span className={styles.itemName}>{item.name}</span>
                  <svg
                    className={styles.itemChevron}
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--text-secondary)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m9 18 6-6-6-6"></path>
                  </svg>
                </button>
              ))}
            </div>
          ))}
          {view.hasNoResults && (
            <div className={styles.noResults}>
              <div className={styles.noResultsText}>
                {"No suggestions for ‘" +
                  view.search +
                  "’. Close this and fill the form in yourself."}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

/** Add or edit one of the service's own customisations (prototype wizOwnEd). */
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
          getOverlayAnimation(false, "dlg", isWide),
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
            // the dialog opens to type a name straight away, as in the prototype
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
                  option.isNeg && styles.signNeg,
                )}
                type="button"
                onClick={option.flip}
                disabled={false}
                aria-label={option.signAria}
                onMouseEnter={option.tipSign}
                onFocus={option.tipSign}
                onMouseLeave={view.tipOut}
                onBlur={view.tipOut}
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
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M18 6 6 18M6 6l12 12"></path>
                  </svg>
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

/** The wizard's dialogs, rendered with the page's other dialogs in prototype order. */
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
