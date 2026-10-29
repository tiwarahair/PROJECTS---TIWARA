import { ListFilter, Search } from "lucide-react";
import { joinClassNames } from "../../../utils/class-names";
import type { StudioController } from "../core/use-studio";
import type { BookingsView } from "./view";
import styles from "../../../styles/features/studio/bookings/search-bar.module.css";
import shared from "../../../styles/features/studio/bookings/index.module.css";

interface SearchBarProps {
  studio: StudioController;
  view: BookingsView;
}

export const SearchBar = ({ studio, view }: SearchBarProps) => {
  const { state, setState } = studio;

  return (
    <div className={shared.search}>
      <div className={styles.searchField}>
        <Search
          className={styles.searchIcon}
          size={15}
          strokeWidth={2}
          color="var(--text-secondary)"
        />
        <input
          className={styles.searchInput}
          value={state.bookingsQuery || ""}
          onChange={(event) => setState({ bookingsQuery: event.target.value })}
          placeholder="Search client or service"
        />
      </div>
      <button
        className={joinClassNames(
          styles.filterButton,
          !!view.filterCount && styles.filterButtonOn,
        )}
        onClick={() =>
          setState({ filterOpen: true, filterOut: false, filterDraft: {} })
        }
        aria-label="Filter bookings"
      >
        <ListFilter size={15} strokeWidth={1.8} />
        Filter
        {view.filterCount && (
          <span className={styles.filterCount}>{view.filterCount}</span>
        )}
      </button>
    </div>
  );
};
