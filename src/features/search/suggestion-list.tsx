import { resolveAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import controls from "./search-controls.module.css";
import type { WhatChip } from "./search-state";
import type {
  RowView,
  SuggestionRow,
  WhatChipView,
} from "./search-suggestions";
import styles from "./suggestion-list.module.css";

interface SuggestionButtonProps {
  view: RowView;
  onPick: (row: SuggestionRow) => void;
  onHover: (index: number) => void;
}

/** One What/Where suggestion: icon or avatar, label with the typed text in bold, optional sub-line (prototype rowVm). */
export const SuggestionButton = ({
  view: { row, index, pre, mid, post, isActive, isOn },
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
    {!!row.icon && (
      <span
        aria-hidden="true"
        className={joinClassNames(styles.rowIcon, controls.rowIconBg)}
      >
        <svg
          className={styles.iconBlock}
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          // prototype icon markup (static strings from SEARCH_ICONS)
          dangerouslySetInnerHTML={{ __html: row.icon }}
        ></svg>
      </span>
    )}
    {!!row.img && (
      <img src={resolveAssetUrl(row.img)} alt="" className={styles.rowAvatar} />
    )}
    <span className={styles.rowText}>
      <span className={styles.rowLabel}>
        {pre}
        <b className={styles.rowMatch}>{mid}</b>
        {post}
      </span>
      {!!row.sub && <span className={styles.rowSub}>{row.sub}</span>}
    </span>
  </button>
);

export interface WhatListProps {
  chips: WhatChipView[];
  sections: { key: string; title: string; rows: RowView[] }[];
  seeAll: RowView[];
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
  showPopular: boolean;
  isEmpty: boolean;
  emptyText: string;
  onPick: (row: SuggestionRow) => void;
  onHover: (index: number) => void;
}

/** Current location, "Popular areas" and matching areas. */
export const WhereList = ({
  current,
  rows,
  showPopular,
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
    {showPopular && <div className={styles.popularAreas}>Popular areas</div>}
    {rows.map((view) => (
      <SuggestionButton
        key={view.key}
        view={view}
        onPick={onPick}
        onHover={onHover}
      />
    ))}
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
  isEmpty: what.isEmpty,
  emptyText: what.emptyText,
  onPickChip: actions.pickWhatChip,
  onPick: actions.pickWhat,
  onHover: actions.hoverWhat,
});
