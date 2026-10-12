import type { CSSProperties } from "react";
import { joinClassNames } from "../../utils/class-names";
import { CheckIcon } from "./check-icon";
import controls from "./search-controls.module.css";
import {
  formatMaxPrice,
  getPriceFill,
  toggleVenue,
  toMaxPrice,
  VENUES,
} from "./search-filters";
import { RADII } from "./search-state";
import helmet from "./search-helmet.module.css";
import styles from "./filters-sheet.module.css";
import type { SearchController } from "./use-search";

interface FiltersSheetProps {
  search: SearchController;
}

/** Mobile/tablet filters bottom sheet: edits a draft, "Show n stylists" applies it (prototype fOpen). */
export const FiltersSheet = ({ search }: FiltersSheetProps) => {
  const { state, filterDraft, draftCount, actions } = search;

  return (
    <div
      data-closing={state.filtersClosing ? "true" : "false"}
      className={joinClassNames(helmet.sheetWrap, styles.wrap)}
    >
      <div
        onClick={actions.closeFilters}
        className={joinClassNames(helmet.sheetScrim, styles.scrim)}
      ></div>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className={joinClassNames(helmet.sheetPanel, styles.panel)}
      >
        <div className={styles.header}>
          <div className={styles.title}>Filters</div>
          <button
            type="button"
            onClick={actions.closeFilters}
            aria-label="Close"
            className={styles.close}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18"></path>
              <path d="m6 6 12 12"></path>
            </svg>
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
                    {isOn && <CheckIcon className={styles.iconBlock} />}
                    {venue}
                  </button>
                );
              })}
            </div>
          </div>
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
              className={helmet.prange}
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
