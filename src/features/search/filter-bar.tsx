import { Check, ChevronDown, Settings2 } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import type { CSSProperties } from "react";
import { joinClassNames } from "../../utils/class-names";
import controls from "../../styles/features/search/controls.module.css";
import {
  formatMaxPrice,
  getPriceFill,
  SORTS,
  toggleVenue,
  toMaxPrice,
  VENUES,
} from "./filters";
import { RADII } from "./state";
import pageGlobal from "../../styles/features/search/index-global.module.css";
import styles from "../../styles/features/search/filter-bar.module.css";
import type { SearchController } from "./use-search";

interface FilterBarProps {
  search: SearchController;
}

/** Venue / price / distance chips (desktop), result count, Filters button (mobile) and Sort. */
export const FilterBar = ({ search }: FilterBarProps) => {
  const { state, selection, place, actions } = search;
  const count = search.total;

  const nearText = place.point
    ? ` near ${place.current ? "you" : place.name}`
    : "";

  const pluralSuffix = count === 1 ? "" : "s";
  const isFinding = search.isLoading && !search.cards.length;
  const findingPlaceholder = search.isSlow ? <Skeleton width={150} /> : null;
  const serviceText = selection.name ? ` for ${selection.name}` : "";

  const hasFilter =
    selection.has ||
    !place.current ||
    !!state.query.date ||
    state.time !== "any" ||
    state.venues.length > 0 ||
    state.maxPrice != null ||
    state.radius !== 10;

  const filterCount =
    state.venues.length +
    (state.maxPrice != null ? 1 : 0) +
    (state.radius !== 10 ? 1 : 0);

  const sortLabel = (SORTS.find(([key]) => key === state.sort) ||
    SORTS[0])?.[1];

  return (
    <div className={joinClassNames(pageGlobal.flWrap, styles.wrap)}>
      <div className={pageGlobal.flLine}>
        <div
          role="group"
          aria-label="Filters"
          className={joinClassNames(pageGlobal.flDesk, styles.desk)}
        >
          {VENUES.map((venue) => {
            const isOn = state.venues.includes(venue);

            return (
              <button
                key={venue}
                type="button"
                onClick={() =>
                  actions.setVenues(toggleVenue(state.venues, venue))
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
          <div className={styles.popoverAnchor}>
            <button
              type="button"
              onClick={actions.togglePrice}
              aria-expanded={state.priceOpen ? "true" : "false"}
              aria-haspopup="dialog"
              className={joinClassNames(
                controls.chip,
                controls.chipLarge,
                state.maxPrice != null && controls.chipOn,
              )}
            >
              {state.maxPrice != null ? `Up to £${state.maxPrice}` : "Price"}
              <ChevronDown
                className={styles.iconBlock}
                size={14}
                strokeWidth={2}
              />
            </button>
            {state.priceOpen && (
              <>
                <div
                  onClick={actions.closePrice}
                  className={styles.popoverScrim}
                ></div>
                <div
                  data-dd=""
                  role="dialog"
                  aria-label="Max price"
                  className={styles.pricePopover}
                >
                  <div className={styles.priceHeader}>
                    <span className={styles.priceTitle}>Max price</span>
                    <span aria-live="polite" className={styles.priceValue}>
                      {formatMaxPrice(state.maxPrice)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="250"
                    step="5"
                    value={state.maxPrice == null ? 250 : state.maxPrice}
                    onChange={(event) =>
                      actions.setMaxPrice(toMaxPrice(event.target.value))
                    }
                    aria-label="Max price"
                    aria-valuetext={formatMaxPrice(state.maxPrice)}
                    className={pageGlobal.prange}
                    // --fill: how much of the track is filled
                    style={
                      {
                        "--fill": getPriceFill(state.maxPrice),
                      } as CSSProperties
                    }
                  />
                  {state.maxPrice != null && (
                    <button
                      type="button"
                      onClick={() => actions.setMaxPrice(null)}
                      className={styles.priceClear}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          <div className={styles.popoverAnchor}>
            <button
              type="button"
              onClick={actions.toggleDistance}
              aria-expanded={state.distanceOpen ? "true" : "false"}
              aria-haspopup="listbox"
              className={joinClassNames(
                controls.chip,
                controls.chipLarge,
                state.radius !== 10 && controls.chipOn,
              )}
            >
              {`Within ${state.radius} miles`}
              <ChevronDown
                className={styles.iconBlock}
                size={14}
                strokeWidth={2}
              />
            </button>
            {state.distanceOpen && (
              <>
                <div
                  onClick={actions.closeDistance}
                  className={styles.popoverScrim}
                ></div>
                <div
                  data-dd=""
                  role="listbox"
                  aria-label="Distance"
                  className={styles.distancePopover}
                >
                  {RADII.map((radius) => {
                    const isSelected = state.radius === radius;

                    return (
                      <button
                        key={`d${radius}`}
                        type="button"
                        role="option"
                        aria-selected={isSelected ? "true" : "false"}
                        onClick={() => actions.pickDistance(radius)}
                        className={joinClassNames(
                          controls.option,
                          isSelected && controls.optionOn,
                        )}
                      >
                        <span className={styles.optionLabel}>
                          {`Within ${radius} miles`}
                        </span>
                        {isSelected && (
                          <Check
                            className={styles.iconBlock}
                            size={14}
                            strokeWidth={2.4}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          {hasFilter && (
            <button
              type="button"
              onClick={actions.clearAll}
              className={styles.clearFilters}
            >
              Clear filters
            </button>
          )}
        </div>

        <div className={joinClassNames(pageGlobal.rlRow, styles.resultRow)}>
          <div
            role="status"
            className={joinClassNames(pageGlobal.rlLine, styles.resultLine)}
          >
            {isFinding ? (
              findingPlaceholder
            ) : (
              <>
                <span className={pageGlobal.rlFull}>
                  {`${count} stylist${pluralSuffix}${serviceText}${nearText}`}
                </span>
                <span className={pageGlobal.rlShort}>
                  {`${count} stylist${pluralSuffix}${nearText}`}
                </span>
              </>
            )}
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              onClick={actions.openFilters}
              className={joinClassNames(pageGlobal.flMob, styles.pillButton)}
            >
              <Settings2
                className={styles.iconBlock}
                size={16}
                strokeWidth={1.7}
              />
              {`Filters${filterCount ? ` · ${filterCount}` : ""}`}
            </button>
            <div className={styles.sortAnchor}>
              <button
                type="button"
                onClick={actions.toggleSort}
                aria-haspopup="listbox"
                aria-expanded={state.sortOpen ? "true" : "false"}
                className={styles.pillButton}
              >
                {`Sort: ${sortLabel}`}
                <ChevronDown
                  className={styles.iconBlock}
                  size={14}
                  strokeWidth={2}
                />
              </button>
              {state.sortOpen && (
                <>
                  <div
                    onClick={actions.closeSort}
                    className={styles.popoverScrim}
                  ></div>
                  <div
                    data-dd=""
                    role="listbox"
                    aria-label="Sort"
                    className={styles.sortPopover}
                  >
                    {SORTS.map(([key, label]) => {
                      const isSelected = state.sort === key;

                      return (
                        <button
                          key={key}
                          type="button"
                          role="option"
                          aria-selected={isSelected ? "true" : "false"}
                          onClick={() => actions.pickSort(key)}
                          className={joinClassNames(
                            controls.option,
                            isSelected && controls.optionOn,
                          )}
                        >
                          <span className={styles.optionLabel}>{label}</span>
                          {isSelected && (
                            <Check
                              className={styles.iconBlock}
                              size={14}
                              strokeWidth={2.4}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
