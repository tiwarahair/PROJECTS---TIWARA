import { joinClassNames } from "../../utils/class-names";
import { ClearButton } from "./clear-button";
import { DatePickerMobile } from "./date-picker";
import { getMobileDateLabel } from "./search-dates";
import helmet from "./search-helmet.module.css";
import { SEARCH_ICONS } from "./search-icons";
import styles from "./mobile-search-sheet.module.css";
import { getWhatListProps, WhatList, WhereList } from "./suggestion-list";
import type { SearchController } from "./use-search";

interface MobileSearchSheetProps {
  search: SearchController;
}

const HEADINGS: Record<string, string> = {
  service: "Search",
  location: "Location",
  date: "Date & time",
};

/** Full-screen mobile search: summary rows → What / Where / Date steps (prototype mob sheet). */
export const MobileSearchSheet = ({ search }: MobileSearchSheetProps) => {
  const { state, refs, selection, place, what, where, actions } = search;
  const dateLabel = getMobileDateLabel(state);
  const rows = [
    {
      key: "w",
      caption: "Search",
      label: selection.display || "All styles",
      icon: SEARCH_ICONS.search ?? "",
      open: actions.openMobileWhat,
      hasClear: !!selection.display,
      clearLabel: "Clear style or stylist",
      clear: actions.clearStyle,
    },
    {
      key: "l",
      caption: "Location",
      label: where.display || "Current location",
      icon: SEARCH_ICONS.pin ?? "",
      open: actions.openMobileWhere,
      hasClear: !place.current,
      clearLabel: "Clear area",
      clear: actions.clearArea,
    },
    {
      key: "d",
      caption: "Date & time",
      label: dateLabel,
      icon: SEARCH_ICONS.calendar ?? "",
      open: actions.openMobileDate,
      hasClear: !!state.q.date || state.time !== "any",
      clearLabel: "Clear date",
      clear: actions.clearDate,
    },
  ];
  const whatValue = state.whatText != null ? state.whatText : selection.display;
  const whereValue = state.whereText != null ? state.whereText : where.display;

  return (
    <div
      data-closing={state.mobClosing ? "true" : "false"}
      className={joinClassNames(helmet.sheetWrap, styles.wrap)}
    >
      <div
        onClick={actions.closeMobileSheet}
        className={joinClassNames(helmet.sheetScrim, styles.scrim)}
      ></div>
      <div className={joinClassNames(helmet.sheetPanel, styles.panel)}>
        <div className={styles.header}>
          {state.mob !== "menu" && (
            <button
              onClick={actions.mobileToMenu}
              aria-label="Back"
              className={styles.headerButton}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5"></path>
                <path d="m12 19-7-7 7-7"></path>
              </svg>
            </button>
          )}
          <div className={styles.spacer}></div>
          <button
            onClick={actions.closeMobileSheet}
            aria-label="Close"
            className={styles.headerButton}
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
          <div className={styles.heading}>
            {HEADINGS[state.mob] || "Search"}
          </div>

          {state.mob === "menu" && (
            <div className={styles.rows}>
              {rows.map(
                ({
                  key,
                  caption,
                  label,
                  icon,
                  open,
                  hasClear,
                  clearLabel,
                  clear,
                }) => (
                  <div key={key} className={styles.row}>
                    <button onClick={open} className={styles.rowButton}>
                      <span className={styles.rowIcon}>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          // prototype icon markup (static strings from SEARCH_ICONS)
                          dangerouslySetInnerHTML={{ __html: icon }}
                        ></svg>
                      </span>
                      <span className={styles.rowText}>
                        <span className={styles.rowCaption}>{caption}</span>
                        <span className={styles.rowLabel}>{label}</span>
                      </span>
                    </button>
                    {hasClear && (
                      <button
                        type="button"
                        onClick={clear}
                        aria-label={clearLabel}
                        className={styles.rowClear}
                      >
                        <svg
                          className={styles.iconBlock}
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                        >
                          <circle cx="12" cy="12" r="9.5"></circle>
                          <path d="m15 9-6 6M9 9l6 6"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                ),
              )}
            </div>
          )}

          {state.mob === "service" && (
            <>
              <div className={styles.searchField}>
                <svg
                  className={styles.searchFieldIcon}
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="7"></circle>
                  <path d="m21 21-4.3-4.3"></path>
                </svg>
                <div className={styles.searchFieldInner}>
                  <div className={styles.fieldRow}>
                    <input
                      ref={refs.whatMobile}
                      type="text"
                      value={whatValue}
                      onChange={actions.changeWhat}
                      onKeyDown={actions.keyWhat}
                      placeholder="All styles"
                      aria-label="Style or stylist"
                      // prototype markup has no aria-controls on its comboboxes; kept as-is
                      // eslint-disable-next-line jsx-a11y/role-has-required-aria-props
                      role="combobox"
                      aria-expanded="true"
                      aria-autocomplete="list"
                      autoComplete="off"
                      enterKeyHint="search"
                      // eslint-disable-next-line jsx-a11y/no-autofocus -- the step opens straight into typing, as in the prototype
                      autoFocus
                      className={styles.input}
                    />
                    {whatValue.length > 0 && (
                      <ClearButton
                        label="Clear style or stylist"
                        onClick={actions.clearWhat}
                        className={styles.clearButton}
                      />
                    )}
                  </div>
                </div>
              </div>
              <div role="listbox" aria-label="Styles and stylists">
                <WhatList {...getWhatListProps(what, actions)} />
              </div>
            </>
          )}

          {state.mob === "location" && (
            <>
              <div className={styles.searchField}>
                <svg
                  className={styles.searchFieldIcon}
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <div className={styles.searchFieldInner}>
                  <div className={styles.fieldRow}>
                    <input
                      ref={refs.whereMobile}
                      type="text"
                      value={whereValue}
                      onChange={actions.changeWhere}
                      onKeyDown={actions.keyWhere}
                      placeholder="Current location"
                      aria-label="Area or postcode"
                      // prototype markup has no aria-controls on its comboboxes; kept as-is
                      // eslint-disable-next-line jsx-a11y/role-has-required-aria-props
                      role="combobox"
                      aria-expanded="true"
                      aria-autocomplete="list"
                      autoComplete="off"
                      enterKeyHint="search"
                      // eslint-disable-next-line jsx-a11y/no-autofocus -- the step opens straight into typing, as in the prototype
                      autoFocus
                      className={styles.input}
                    />
                    {whereValue.length > 0 && (
                      <ClearButton
                        label="Clear area"
                        onClick={actions.clearWhere}
                        className={styles.clearButton}
                      />
                    )}
                  </div>
                </div>
              </div>
              <div role="listbox" aria-label="Areas">
                <WhereList
                  current={where.current}
                  rows={where.rows}
                  showPopular={where.showPopular}
                  isEmpty={where.isEmpty}
                  emptyText={where.emptyText}
                  onPick={actions.pickLocation}
                  onHover={actions.hoverWhere}
                />
              </div>
            </>
          )}

          {state.mob === "date" && <DatePickerMobile search={search} />}
        </div>
        {state.mob === "menu" && (
          <div className={styles.footer}>
            <button
              onClick={actions.closeMobileSheet}
              className={styles.searchButton}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="7"></circle>
                <path d="m21 21-4.3-4.3"></path>
              </svg>
              Search
            </button>
          </div>
        )}
        {state.mob === "date" && (
          <div className={styles.dateFooter}>
            <button onClick={actions.clearDate} className={styles.clearButton2}>
              Clear
            </button>
            <button
              onClick={actions.mobileToMenu}
              className={styles.doneButton}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
