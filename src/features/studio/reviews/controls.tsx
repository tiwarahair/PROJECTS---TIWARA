import { ChevronDown, Search, X } from "lucide-react";
import { joinClassNames } from "../../../utils/class-names";
import { SORT_OPTIONS } from "./view";
import type { ReviewSort } from "./view";
import styles from "../../../styles/features/studio/reviews/index.module.css";

interface ReviewControlsProps {
  search: string;
  sort: ReviewSort;
  isRepliedOnly: boolean;
  replied: number;
  onSearch: (search: string) => void;
  onSort: (sort: ReviewSort) => void;
  onToggleReplied: () => void;
}

/** Search, sort and the "Replied to" filter, in the Clients controls style. */
export const ReviewControls = ({
  search,
  sort,
  isRepliedOnly,
  replied,
  onSearch,
  onSort,
  onToggleReplied,
}: ReviewControlsProps) => (
  <div className={styles.controls}>
    <label className={styles.search}>
      <Search size={15} strokeWidth={1.5} />
      <input
        className={styles.searchInput}
        placeholder="Search by client or service"
        aria-label="Search reviews by client or service"
        value={search}
        onChange={(event) => onSearch(event.target.value)}
      />
      {!!search && (
        <button
          type="button"
          className={styles.clearSearch}
          aria-label="Clear search"
          onClick={() => onSearch("")}
        >
          <X size={15} strokeWidth={1.7} />
        </button>
      )}
    </label>
    <label className={styles.sort}>
      Sort
      <select
        className={styles.sortSelect}
        aria-label="Sort reviews"
        value={sort}
        onChange={(event) => onSort(event.target.value as ReviewSort)}
      >
        {SORT_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} strokeWidth={2} className={styles.sortChevron} />
    </label>
    <button
      type="button"
      aria-pressed={isRepliedOnly}
      className={joinClassNames(styles.chip, isRepliedOnly && styles.chipOn)}
      onClick={onToggleReplied}
    >
      {isRepliedOnly ? (
        <>
          Replied to
          <X size={13} strokeWidth={2.2} />
        </>
      ) : (
        <>
          Replied to <span className={styles.chipCount}>{replied}</span>
        </>
      )}
    </button>
  </div>
);
