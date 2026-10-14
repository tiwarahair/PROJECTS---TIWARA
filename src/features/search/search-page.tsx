import { useLayoutEffect } from "react";
import { FavHost } from "../../components/fav-host/fav-host";
import { StylistCard } from "../../components/stylist-card/stylist-card";
import { WelcomeToast } from "../../components/welcome-toast/welcome-toast";
import { useLoadMore } from "../../hooks/use-load-more";
import { useSearchMemory } from "../../hooks/use-search-memory";
import { MapsProvider } from "../../lib/google-maps";
import { DatePopover } from "./date-picker";
import { FilterBar } from "./filter-bar";
import { FiltersSheet } from "./filters-sheet";
import { LocationPrompt } from "./location-prompt";
import { MobileSearchSheet } from "./mobile-search-sheet";
import pageGlobal from "../../styles/features/search/search-page-global.module.css";
import { SearchNav } from "./search-nav";
import styles from "../../styles/features/search/search-page.module.css";
import { useSearch } from "./use-search";

/** Search & results, route "/search". */
const SearchView = () => {
  const search = useSearch();
  const { state, place, selection, cards, suggestions, actions } = search;
  const sentinelRef = useLoadMore(search.loadMore, search.hasMore);

  useSearchMemory();

  // page-wide rules apply while Search is mounted
  useLayoutEffect(() => {
    document.documentElement.classList.add("search-page");

    return () => document.documentElement.classList.remove("search-page");
  }, []);

  const locationName = place.current ? "you" : place.name;
  const isEmpty = !search.isLoading && !search.isError && !cards.length;
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
        <LocationPrompt search={search} />
        <div className={styles.grid} aria-busy={search.isLoading}>
          {cards.map(({ key, name, ...card }) => (
            <div key={key} className={pageGlobal.rescard}>
              <StylistCard stylistName={name} {...card} />
            </div>
          ))}
        </div>
        {search.hasMore && (
          <div ref={sentinelRef} className={styles.more}>
            <button
              onClick={search.loadMore}
              disabled={search.isLoadingMore}
              className={styles.suggestion}
            >
              {search.isLoadingMore ? "Loading…" : "Show more"}
            </button>
          </div>
        )}
        {isEmpty && (
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

export const SearchPage = () => (
  <MapsProvider>
    <SearchView />
  </MapsProvider>
);
