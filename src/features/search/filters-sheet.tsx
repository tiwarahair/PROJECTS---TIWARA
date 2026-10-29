import { Check, X } from "lucide-react";
import type { CSSProperties } from "react";
import { joinClassNames } from "../../utils/class-names";
import controls from "../../styles/features/search/controls.module.css";
import {
  formatMaxPrice,
  getPriceFill,
  toggleVenue,
  toMaxPrice,
  VENUES,
} from "./filters";
import { RADII } from "./state";
import pageGlobal from "../../styles/features/search/index-global.module.css";
import styles from "../../styles/features/search/filters-sheet.module.css";
import type { SearchController } from "./use-search";

interface FiltersSheetProps {
  search: SearchController;
}

/** Mobile/tablet filters bottom sheet: edits a draft, "Show n stylists" applies it. */
export const FiltersSheet = ({ search }: FiltersSheetProps) => {
  const { state, filterDraft, draftCount, actions } = search;

  return (
    <div
      data-closing={state.filtersClosing ? "true" : "false"}
      className={joinClassNames(pageGlobal.sheetWrap, styles.wrap)}
    >
      <div
        onClick={actions.closeFilters}
        className={joinClassNames(pageGlobal.sheetScrim, styles.scrim)}
      ></div>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className={joinClassNames(pageGlobal.sheetPanel, styles.panel)}
      >
        <div className={styles.header}>
          <div className={styles.title}>Filters</div>
          <button
            type="button"
            onClick={actions.closeFilters}
            aria-label="Close"
            className={styles.close}
          >
            <X size={24} strokeWidth={2} />
          </button>
        </div>
        <div className={styles.body}>
          <div>
            <div className={styles.groupTitle}>Venue</div>
            <div className={styles.chips}>
              {VENUES.map((venue) => {
                const isOn = filterDraft.venues.includes(venue);

                return (
                  <button
                    key={venue}
                    type="button"
                    onClick={() =>
                      actions.setFilterDraft({
                        venues: toggleVenue(filterDraft.venues, venue),
                      })
                    }
                    aria-pressed={isOn ? "true" : "false"}
                    className={joinClassNames(
                      controls.chip,
                      controls.chipLarge,
                      isOn && controls.chipOn,
                    )}
                  >
                    {isOn && (
                      <Check
                        className={styles.iconBlock}
                        size={14}
                        strokeWidth={2.4}
                      />
                    )}
                    {venue}
                  </button>
                );
              })}
            </div>
          </div>
          {!!search.place.point && (
            <div>
              <div className={styles.groupTitle}>Distance</div>
              <div
                role="radiogroup"
                aria-label="Distance"
                className={styles.chips}
              >
                {RADII.map((radius) => {
                  const isOn = (filterDraft.radius || 10) === radius;

                  return (
                    <button
                      key={`fd${radius}`}
                      type="button"
                      role="radio"
                      aria-checked={isOn ? "true" : "false"}
                      onClick={() => actions.setFilterDraft({ radius })}
                      className={joinClassNames(
                        controls.chip,
                        controls.chipLarge,
                        isOn && controls.chipOn,
                      )}
                    >
                      {`${radius} miles`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div>
            <div className={styles.priceHeader}>
              <span className={styles.priceTitle}>Max price</span>
              <span aria-live="polite" className={styles.priceValue}>
                {formatMaxPrice(filterDraft.maxPrice)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="250"
              step="5"
              value={filterDraft.maxPrice == null ? 250 : filterDraft.maxPrice}
              onChange={(event) =>
                actions.setFilterDraft({
                  maxPrice: toMaxPrice(event.target.value),
                })
              }
              aria-label="Max price"
              aria-valuetext={formatMaxPrice(filterDraft.maxPrice)}
              className={pageGlobal.prange}
              // --fill: how much of the track is filled
              style={
                {
                  "--fill": getPriceFill(filterDraft.maxPrice),
                } as CSSProperties
              }
            />
          </div>
        </div>
        <div className={styles.footer}>
          <button
            type="button"
            onClick={actions.clearFilterDraft}
            className={styles.clear}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={actions.applyFilters}
            className={styles.apply}
          >
            {`Show ${draftCount} stylist${draftCount === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
};
