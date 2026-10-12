import { useLayoutEffect } from "react";
import { FavHost } from "../../components/fav-host/fav-host";
import { StylistCard } from "../../components/stylist-card/stylist-card";
import { WelcomeToast } from "../../components/welcome-toast/welcome-toast";
import { useSearchMemory } from "../../hooks/use-search-memory";
import { DatePopover } from "./date-picker";
import { FilterBar } from "./filter-bar";
import { FiltersSheet } from "./filters-sheet";
import { MobileSearchSheet } from "./mobile-search-sheet";
import helmet from "../../styles/features/search/search-helmet.module.css";
import { SearchNav } from "./search-nav";
import styles from "../../styles/features/search/search-page.module.css";
import { useSearch } from "./use-search";

/** Search & results, route "/search". */
export const SearchPage = () => {
  const search = useSearch();
  const { state, place, selection, cards, suggestions, actions } = search;

  useSearchMemory();

  // page-wide helmet rules apply while Search is mounted
  useLayoutEffect(() => {
    document.documentElement.classList.add("search-page");

    return () => document.documentElement.classList.remove("search-page");
  }, []);

  const locationName = place.current ? "you" : place.name;
  const serviceText = selection.name ? ` for ${selection.name}` : "";

  return (
    <div data-screen-label="Search" className={styles.page}>
      {!state.mobileView && (state.whatOpen || state.whereOpen) && (
        <div
          onClick={actions.closeDropdowns}
          className={styles.dropdownScrim}
        ></div>
      )}
      <SearchNav search={search} />
      {state.dateOpen && <DatePopover search={search} />}
      {!!state.mobileView && <MobileSearchSheet search={search} />}
      <FilterBar search={search} />

      <div className={styles.results}>
        <div className={styles.grid}>
          {cards.map(
            ({
              key,
              href,
              cover,
              name,
              rating,
              reviews,
              area,
              services,
              meta,
              rows,
              facts,
              from,
              verified,
            }) => (
              <div key={key} className={helmet.rescard}>
                <StylistCard
                  href={href}
                  cover={cover}
                  stylistName={name}
                  rating={rating}
                  reviews={reviews}
                  area={area}
                  services={services}
                  meta={meta}
                  rows={rows}
                  facts={facts}
                  from={from}
                  verified={verified}
                />
              </div>
            ),
          )}
        </div>
        {cards.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No stylists match that yet</div>
            <div className={styles.emptyText}>
              {`No stylists${serviceText} near ${locationName} match these filters.`}
            </div>
            <div className={styles.emptyActions}>
              {suggestions.map(({ key, label, pick }) => (
                <button key={key} onClick={pick} className={styles.suggestion}>
                  {label}
                </button>
              ))}
              <button onClick={actions.clearAll} className={styles.emptyClear}>
                Clear filters
              </button>
            </div>
          </div>
        )}
      </div>

      {state.filtersOpen && <FiltersSheet search={search} />}
      <WelcomeToast />
      <FavHost />
    </div>
  );
};
