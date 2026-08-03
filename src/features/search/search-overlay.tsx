import { cx } from "../../utils/class-names";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import {
  bookingOpened,
  profileOpened,
  searchClosed,
  searchLocationChanged,
  searchStyleChanged,
} from "../../stores/overlays-slice";
import { STYLISTS } from "../../data/stylists";
import { filterStylists, stylistCountLabel } from "../../utils/filter-stylists";
import { StylistCard } from "./stylist-card";
import { useMemo } from "react";
import type { ServiceId } from "../../types/services";
import { capitaliseServiceId, SERVICES } from "../../data/services/services";

export function SearchOverlay() {
  const dispatch = useAppDispatch();
  const { overlay, searchStyle, searchLocation } = useAppSelector(
    (state) => state.overlays,
  );

  const results = useMemo(
    () =>
      filterStylists(STYLISTS, {
        style: searchStyle,
        location: searchLocation,
      }),
    [searchStyle, searchLocation],
  );

  function scrollToJoin() {
    dispatch(searchClosed());
    document
      .querySelector(".join-platform")
      ?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div id="searchPage" className={cx("sr-overlay", overlay.search && "open")}>
      <div className="sr-header">
        <button className="sr-back" onClick={() => dispatch(searchClosed())}>
          Back to site
        </button>
        <span className="sr-title">Find your stylist</span>
        <span className="sr-count">{stylistCountLabel(results.length)}</span>
      </div>

      <div className="sr-filters">
        <div className="sr-filter-bar">
          <div className="sr-filter-field">
            <span className="sr-filter-icon">📍</span>
            <input
              type="text"
              placeholder="City or postcode"
              className="sr-filter-input"
              value={searchLocation}
              onChange={(event) =>
                dispatch(searchLocationChanged(event.target.value))
              }
            />
          </div>
          <div className="sr-filter-sep" />
          <div className="sr-filter-field">
            <span className="sr-filter-icon">✂</span>
            <select
              className="sr-filter-select"
              value={searchStyle}
              onChange={(event) =>
                dispatch(
                  searchStyleChanged(event.target.value as ServiceId | ""),
                )
              }
            >
              <option value="">All styles</option>
              {SERVICES.map(({ id, label }) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* Chips and the select are two views of the same value, so they stay
            in sync in both directions without any extra wiring. */}
        <div className="sr-chips-row">
          <span
            className={cx("sr-chip", searchStyle === "" && "active")}
            data-filter=""
            onClick={() => dispatch(searchStyleChanged(""))}
          >
            All
          </span>
          {SERVICES.map(({ id }) => (
            <span
              key={id}
              className={cx("sr-chip", searchStyle === id && "active")}
              data-filter={id}
              onClick={() => dispatch(searchStyleChanged(id))}
            >
              {capitaliseServiceId(id)}
            </span>
          ))}
        </div>
      </div>

      <div className="sr-body">
        <div className="sr-grid">
          {results.length > 0 ? (
            results.map((stylist) => (
              <StylistCard
                key={stylist.id}
                stylist={stylist}
                onOpenProfile={(id) => dispatch(profileOpened(id))}
                onBook={({ catKey, id, name }) =>
                  dispatch(
                    bookingOpened({
                      categoryKey: catKey,
                      stylistId: id,
                      stylistName: name,
                    }),
                  )
                }
              />
            ))
          ) : (
            // TO DO: SEE HOW THIS LOOKS
            <div className="sr-empty">
              No stylists in this area yet.
              <br />
              <a
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  scrollToJoin();
                }}
              >
                Be the first to join →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
