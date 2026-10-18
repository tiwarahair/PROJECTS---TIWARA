import { ChevronRight, Search, X } from "lucide-react";
import { joinClassNames } from "../../../../../utils/class-names";
import { getOverlayAnimation } from "../../../shell/overlay";
import type { WizardView } from "../view";
import shared from "../../../../../styles/features/studio/services/wizard/dialogs/index.module.css";
import styles from "../../../../../styles/features/studio/services/wizard/dialogs/suggestions.module.css";

export interface SuggestionsDialogProps {
  view: WizardView;
}

/** Suggested services: search the platform's service types. */
export const SuggestionsDialog = ({ view }: SuggestionsDialogProps) => {
  if (!view.isSuggestionsOpen) return null;

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className={shared.scrim70} onClick={view.closeSuggestions}></div>
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
