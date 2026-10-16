import { ResponsiveImage } from "../../components/responsive-image/responsive-image";
import { SuggestionRowSkeleton } from "../../components/skeleton/suggestion-row-skeleton";
import { joinClassNames } from "../../utils/class-names";
import controls from "../../styles/features/search/search-controls.module.css";
import type { WhatChip } from "./search-state";
import type {
  RowView,
  SuggestionRow,
  WhatChipView,
} from "./search-suggestions";
import styles from "../../styles/features/search/suggestion-list.module.css";

interface SuggestionButtonProps {
  view: RowView;
  onPick: (row: SuggestionRow) => void;
  onHover: (index: number) => void;
}

/** One What/Where suggestion: icon or avatar, label with the typed text in bold, optional sub-line. */
const SuggestionButton = ({
  view: {
    row,
    row: { icon: RowIcon },
    index,
    before,
    match,
    after,
    isActive,
    isOn,
  },
  onPick,
  onHover,
}: SuggestionButtonProps) => (
  <button
    type="button"
    role="option"
    aria-selected={isActive ? "true" : "false"}
    onClick={() => onPick(row)}
    onMouseEnter={() => onHover(index)}
    className={joinClassNames(
      controls.row,
      isActive && controls.rowActive,
      isOn && controls.rowOn,
    )}
  >
    {!!RowIcon && (
      <span
        aria-hidden="true"
        className={joinClassNames(styles.rowIcon, controls.rowIconBg)}
      >
        <RowIcon className={styles.iconBlock} size={17} strokeWidth={1.7} />
      </span>
    )}
    {!!row.image && (
      <ResponsiveImage
        hasShimmer
        src={row.image}
        sizes="36px"
        alt=""
        className={styles.rowAvatar}
      />
    )}
    <span className={styles.rowText}>
      <span className={styles.rowLabel}>
        {before}
        <b className={styles.rowMatch}>{match}</b>
        {after}
      </span>
      {!!row.subtitle && <span className={styles.rowSub}>{row.subtitle}</span>}
    </span>
  </button>
);

export interface WhatListProps {
  chips: WhatChipView[];
  sections: { key: string; title: string; rows: RowView[] }[];
  seeAll: RowView[];
  /** Stylists are still loading: a Stylists section of placeholders. */
  isLoadingStylists: boolean;
  isEmpty: boolean;
  emptyText: string;
  onPickChip: (chip: WhatChip) => void;
  onPick: (row: SuggestionRow) => void;
  onHover: (index: number) => void;
}

/** All / Styles / Stylists chips, grouped rows, "See all results" and the empty message. */
export const WhatList = ({
  chips,
  sections,
  seeAll,
  isLoadingStylists,
  isEmpty,
  emptyText,
  onPickChip,
  onPick,
  onHover,
}: WhatListProps) => (
  <>
    <div className={styles.chips}>
      {chips.map(({ key, label, count, on }) => (
        <button
          key={key}
          type="button"
          onClick={() => onPickChip(key)}
          aria-pressed={on ? "true" : "false"}
          className={joinClassNames(controls.chip, on && controls.chipOn)}
        >
          {label}
          <span className={styles.chipCount}>{count}</span>
        </button>
      ))}
    </div>
    {sections.map(({ key, title, rows }) => (
      <div key={key} role="group" aria-label={title} className={styles.section}>
        <div className={styles.sectionTitle}>{title}</div>
        {rows.map((view) => (
          <SuggestionButton
            key={view.key}
            view={view}
            onPick={onPick}
            onHover={onHover}
          />
        ))}
      </div>
    ))}
    {isLoadingStylists && (
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Stylists</div>
        <SuggestionRowSkeleton />
        <SuggestionRowSkeleton />
      </div>
    )}
    {seeAll.length > 0 && (
      <div className={styles.seeAll}>
        {seeAll.map((view) => (
          <SuggestionButton
            key={view.key}
            view={view}
            onPick={onPick}
            onHover={onHover}
          />
        ))}
      </div>
    )}
    {isEmpty && (
      <div role="status" className={styles.whatEmpty}>
        {emptyText}
      </div>
    )}
  </>
);

export interface WhereListProps {
  current: RowView[];
  rows: RowView[];
  /** Google is still looking up places. */
  isLoading: boolean;
  isEmpty: boolean;
  emptyText: string;
  onPick: (row: SuggestionRow) => void;
  onHover: (index: number) => void;
}

/** Current location, or the places matching what was typed. */
export const WhereList = ({
  current,
  rows,
  isLoading,
  isEmpty,
  emptyText,
  onPick,
  onHover,
}: WhereListProps) => (
  <>
    {current.map((view) => (
      <SuggestionButton
        key={view.key}
        view={view}
        onPick={onPick}
        onHover={onHover}
      />
    ))}
    {rows.map((view) => (
      <SuggestionButton
        key={view.key}
        view={view}
        onPick={onPick}
        onHover={onHover}
      />
    ))}
    {isLoading && (
      <>
        <SuggestionRowSkeleton />
        <SuggestionRowSkeleton />
        <SuggestionRowSkeleton />
      </>
    )}
    {isEmpty && (
      <div role="status" className={styles.whereEmpty}>
        {emptyText}
      </div>
    )}
  </>
);

/** Props shared by the desktop dropdowns and the mobile sheet. */
export const getWhatListProps = (
  what: {
    chips: WhatChipView[];
    sections: { key: string; title: string; rows: RowView[] }[];
    seeAll: RowView[];
    isLoadingStylists: boolean;
    isEmpty: boolean;
    emptyText: string;
  },
  actions: {
    pickWhatChip: (chip: WhatChip) => void;
    pickWhat: (row: SuggestionRow) => void;
    hoverWhat: (index: number) => void;
  },
): WhatListProps => ({
  chips: what.chips,
  sections: what.sections,
  seeAll: what.seeAll,
  isLoadingStylists: what.isLoadingStylists,
  isEmpty: what.isEmpty,
  emptyText: what.emptyText,
  onPickChip: actions.pickWhatChip,
  onPick: actions.pickWhat,
  onHover: actions.hoverWhat,
});
