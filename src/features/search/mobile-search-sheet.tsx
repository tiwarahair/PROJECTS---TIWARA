import { ArrowLeft, CircleX, MapPin, Search, X } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { ClearButton } from "./clear-button";
import { DatePickerMobile } from "./date-picker";
import { getMobileDateLabel } from "./dates";
import pageGlobal from "../../styles/features/search/index-global.module.css";
import { getRowStrokeWidth, SEARCH_ICONS } from "./icons";
import styles from "../../styles/features/search/mobile-search-sheet.module.css";
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

/** Full-screen mobile search: summary rows → What / Where / Date steps. */
export const MobileSearchSheet = ({ search }: MobileSearchSheetProps) => {
  const { state, refs, selection, place, what, where, actions } = search;
  const dateLabel = getMobileDateLabel(state);

  const rows = [
    {
      key: "w",
      caption: "Search",
      label: selection.display || "All styles",
      icon: SEARCH_ICONS.search,
      open: actions.openMobileWhat,
      hasClear: !!selection.display,
      clearLabel: "Clear style or stylist",
      clear: actions.clearStyle,
    },
    {
      key: "l",
      caption: "Location",
      label: where.display || where.placeholder,
      icon: SEARCH_ICONS.pin,
      open: actions.openMobileWhere,
      hasClear: !place.current,
      clearLabel: "Clear area",
      clear: actions.clearArea,
    },
    {
      key: "d",
      caption: "Date & time",
      label: dateLabel,
      icon: SEARCH_ICONS.calendar,
      open: actions.openMobileDate,
      hasClear: !!state.query.date || state.time !== "any",
      clearLabel: "Clear date",
      clear: actions.clearDate,
    },
  ];

  const whatValue = state.whatText != null ? state.whatText : selection.display;
  const whereValue = state.whereText != null ? state.whereText : where.display;

  return (
    <div
      data-closing={state.mobileClosing ? "true" : "false"}
      className={joinClassNames(pageGlobal.sheetWrap, styles.wrap)}
    >
      <div
        onClick={actions.closeMobileSheet}
        className={joinClassNames(pageGlobal.sheetScrim, styles.scrim)}
      ></div>
      <div className={joinClassNames(pageGlobal.sheetPanel, styles.panel)}>
        <div className={styles.header}>
          {state.mobileView !== "menu" && (
            <button
              onClick={actions.mobileToMenu}
              aria-label="Back"
              className={styles.headerButton}
            >
              <ArrowLeft size={24} strokeWidth={2} />
            </button>
          )}
          <div className={styles.spacer}></div>
          <button
            onClick={actions.closeMobileSheet}
            aria-label="Close"
            className={styles.headerButton}
          >
            <X size={24} strokeWidth={2} />
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.heading}>
            {HEADINGS[state.mobileView] || "Search"}
          </div>

          {state.mobileView === "menu" && (
            <div className={styles.rows}>
              {rows.map(
                ({
                  key,
                  caption,
                  label,
                  icon: RowIcon,
                  open,
                  hasClear,
                  clearLabel,
                  clear,
                }) => (
                  <div key={key} className={styles.row}>
                    <button onClick={open} className={styles.rowButton}>
                      <span className={styles.rowIcon}>
                        <RowIcon
                          size={20}
                          strokeWidth={getRowStrokeWidth(RowIcon)}
                        />
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
                        <CircleX
                          className={styles.iconBlock}
                          size={22}
                          strokeWidth={1.7}
                        />
                      </button>
                    )}
                  </div>
                ),
              )}
            </div>
          )}

          {state.mobileView === "service" && (
            <>
              <div className={styles.searchField}>
                <Search
                  className={styles.searchFieldIcon}
                  size={19}
                  strokeWidth={1.7}
                />
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
                      // no aria-controls on the comboboxes; kept as-is
                      // eslint-disable-next-line jsx-a11y/role-has-required-aria-props
                      role="combobox"
                      aria-expanded="true"
                      aria-autocomplete="list"
                      autoComplete="off"
                      enterKeyHint="search"
                      // eslint-disable-next-line jsx-a11y/no-autofocus -- the step opens straight into typing
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

          {state.mobileView === "location" && (
            <>
              <div className={styles.searchField}>
                <MapPin
                  className={styles.searchFieldIcon}
                  size={19}
                  strokeWidth={1.8}
                />
                <div className={styles.searchFieldInner}>
                  <div className={styles.fieldRow}>
                    <input
                      ref={refs.whereMobile}
                      type="text"
                      value={whereValue}
                      onChange={actions.changeWhere}
                      onKeyDown={actions.keyWhere}
                      placeholder={where.placeholder}
                      aria-label="Area or postcode"
                      // no aria-controls on the comboboxes; kept as-is
                      // eslint-disable-next-line jsx-a11y/role-has-required-aria-props
                      role="combobox"
                      aria-expanded="true"
                      aria-autocomplete="list"
                      autoComplete="off"
                      enterKeyHint="search"
                      // eslint-disable-next-line jsx-a11y/no-autofocus -- the step opens straight into typing
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
                  isLoading={where.isLoading}
                  isEmpty={where.isEmpty}
                  emptyText={where.emptyText}
                  onPick={actions.pickLocation}
                  onHover={actions.hoverWhere}
                />
              </div>
            </>
          )}

          {state.mobileView === "date" && <DatePickerMobile search={search} />}
        </div>
        {state.mobileView === "menu" && (
          <div className={styles.footer}>
            <button
              onClick={actions.closeMobileSheet}
              className={styles.searchButton}
            >
              <Search size={17} strokeWidth={2} />
              Search
            </button>
          </div>
        )}
        {state.mobileView === "date" && (
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
