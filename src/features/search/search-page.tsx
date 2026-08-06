import { useMemo } from "react";
import { useNavigate } from "react-router";
import { cx } from "../../utils/class-names";
import { filterStylists, stylistCountLabel } from "../../utils/filter-stylists";
import { StylistCard } from "./stylist-card";
import { useSearchFilters } from "./use-search-filters";
import { useRouteSurfaces } from "../../hooks/use-route-surfaces";
import { Header } from "../landing/header";
import { bookingPath, PATH, profilePath } from "../../routes/routes";
import { BOOKING_STEP } from "../../types/booking";
import { capitaliseServiceId, SERVICES } from "../../data/services/services";
import type { ServiceId } from "../../types/services";
import { STYLISTS } from "../../data/stylist/stylist";

export function SearchPage() {
  const navigate = useNavigate();
  const surfaces = useRouteSurfaces();

  // While a booking sits on top, the live URL is the booking's — so the
  // filters come from the location this page was frozen at instead.
  const { style, location, setStyle, setLocation } = useSearchFilters(
    surfaces.top === "search" ? undefined : surfaces.backdropLocation?.search,
  );

  const results = useMemo(
    () => filterStylists(STYLISTS, { style, location }),
    [style, location],
  );

  function scrollToJoin() {
    navigate(PATH.home);
    document
      .querySelector(".join-platform")
      ?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div id="searchPage" className="sr-overlay">
      <Header solid />
      <div className="sr-header">
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
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </div>
          <div className="sr-filter-sep" />
          <div className="sr-filter-field">
            <span className="sr-filter-icon">✂</span>
            <select
              className="sr-filter-select"
              value={style}
              onChange={(event) =>
                setStyle(event.target.value as ServiceId | "")
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
        {/* Chips and the select are two views of the same query param, so they
            stay in sync in both directions without any extra wiring. */}
        <div className="sr-chips-row">
          <span
            className={cx("sr-chip", style === "" && "active")}
            data-filter=""
            onClick={() => setStyle("")}
          >
            All
          </span>
          {SERVICES.map(({ id }) => (
            <span
              key={id}
              className={cx("sr-chip", style === id && "active")}
              data-filter={id}
              onClick={() => setStyle(id)}
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
                onOpenProfile={(slug) => navigate(profilePath(slug))}
                onBook={({ slug }) =>
                  navigate(bookingPath(BOOKING_STEP.service, { stylist: slug }))
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
