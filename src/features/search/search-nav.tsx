import type { CSSProperties } from "react";
import { Link } from "react-router";
import { useAppSelector } from "../../stores/hooks";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { ClearButton } from "./clear-button";
import { getDateLabel, getMobileDateLabel } from "./search-dates";
import { SearchMenu } from "./search-menu";
import helmet from "./search-helmet.module.css";
import styles from "./search-nav.module.css";
import { getWhatListProps, WhatList, WhereList } from "./suggestion-list";
import type { SearchController } from "./use-search";

interface SearchNavProps {
  search: SearchController;
}

/** Sticky nav with the What / Where / When pill (desktop) or the tappable summary (mobile). */
export const SearchNav = ({ search }: SearchNavProps) => {
  const { state, refs, viewportWidth, selection, what, where, actions } =
    search;

  const loggedIn = useAppSelector((root) => root.session.loggedIn);
  const isMobileSheet = !!state.mobileView;
  const whatValue = state.whatText != null ? state.whatText : selection.display;
  const whereValue = state.whereText != null ? state.whereText : where.display;
  const hasDate = !!state.query.date || state.time !== "any";
  const mobileDateLabel = getMobileDateLabel(state);
  const mobileWhereLabel = where.display || "Current location";

  // pillMax: the pill grows with the window, leaving room for the logo and the right rail
  const pillStyle = {
    "--pill-max": `${Math.min(880, viewportWidth - (viewportWidth < 1100 ? 300 : 360))}px`,
  } as CSSProperties;

  return (
    <nav ref={refs.nav} className={styles.nav}>
      <div className={joinClassNames(helmet.navinner, styles.inner)}>
        <div className={joinClassNames(helmet.navRail, styles.railLeft)}>
          <Link to="/" className={styles.logoLink}>
            <img
              src={getAssetUrl("logos/logo-crimson.png")}
              alt="Tiwára's House"
              className={styles.logo}
            />
          </Link>
        </div>
        <div
          data-expanded="true"
          className={joinClassNames(helmet.searchPill, styles.pill)}
          style={pillStyle}
        >
          <div
            className={joinClassNames(helmet.spMobile, styles.mobileSummary)}
          >
            <Link to="/" aria-label="Back" className={styles.mobileBack}>
              <svg
                width="20"
                height="20"
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
            </Link>
            <button
              onClick={actions.openMobileSheet}
              className={styles.mobileSummaryButton}
            >
              <span className={styles.mobileTitle}>
                {selection.display || "All styles"}
              </span>
              <span className={styles.mobileSub}>
                {`${mobileDateLabel} · ${mobileWhereLabel}`}
              </span>
            </button>
          </div>
          <div className={joinClassNames(helmet.hsField, styles.field)}>
            <div className={styles.fieldRow}>
              <input
                ref={refs.what}
                type="text"
                value={whatValue}
                onFocus={actions.focusWhat}
                onChange={actions.changeWhat}
                onKeyDown={actions.keyWhat}
                placeholder="All styles"
                aria-label="Style or stylist"
                // no aria-controls on the comboboxes; kept as-is
                // eslint-disable-next-line jsx-a11y/role-has-required-aria-props
                role="combobox"
                aria-expanded={state.whatOpen ? "true" : "false"}
                aria-autocomplete="list"
                autoComplete="off"
                enterKeyHint="search"
                className={styles.input}
              />
              {whatValue.length > 0 && (
                <ClearButton
                  label="Clear style or stylist"
                  onClick={actions.clearWhat}
                />
              )}
            </div>
            {state.whatOpen && !isMobileSheet && (
              <div
                data-dd=""
                role="listbox"
                aria-label="Styles and stylists"
                className={styles.whatDropdown}
              >
                <WhatList {...getWhatListProps(what, actions)} />
              </div>
            )}
          </div>
          <div className={joinClassNames(helmet.hsField, styles.field)}>
            <div className={styles.fieldRow}>
              <input
                ref={refs.where}
                type="text"
                value={whereValue}
                onFocus={actions.focusWhere}
                onChange={actions.changeWhere}
                onKeyDown={actions.keyWhere}
                placeholder="Current location"
                aria-label="Area or postcode"
                // no aria-controls on the comboboxes; kept as-is
                // eslint-disable-next-line jsx-a11y/role-has-required-aria-props
                role="combobox"
                aria-expanded={state.whereOpen ? "true" : "false"}
                aria-autocomplete="list"
                autoComplete="off"
                enterKeyHint="search"
                className={styles.input}
              />
              {whereValue.length > 0 && (
                <ClearButton label="Clear area" onClick={actions.clearWhere} />
              )}
            </div>
            {state.whereOpen && !isMobileSheet && (
              <div
                data-dd=""
                role="listbox"
                aria-label="Areas"
                className={styles.whereDropdown}
              >
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
            )}
          </div>
          <div className={joinClassNames(helmet.hsField, styles.dateField)}>
            <div className={styles.fieldRow}>
              <button onClick={actions.openDate} className={styles.dateButton}>
                {getDateLabel(state)}
              </button>
              {hasDate && (
                <ClearButton label="Clear date" onClick={actions.clearDate} />
              )}
            </div>
          </div>
          <button
            onClick={actions.search}
            aria-label="Search"
            className={joinClassNames(helmet.spBtn, styles.searchButton)}
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
            <span
              className={joinClassNames(helmet.spLabel, styles.searchLabel)}
            >
              Search
            </span>
          </button>
        </div>
        <div className={joinClassNames(helmet.navRail, styles.railRight)}>
          {loggedIn && (
            <Link
              to="/account?section=favourites"
              aria-label="Favourites"
              title="Favourites"
              className={styles.favourites}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z"></path>
              </svg>
            </Link>
          )}
          <SearchMenu />
        </div>
      </div>
    </nav>
  );
};
