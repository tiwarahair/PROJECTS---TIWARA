import { ArrowLeft, Heart, Search } from "lucide-react";
import type { CSSProperties } from "react";
import { Link } from "react-router";
import { AccountAvatar, SiteMenu } from "../../components/site-menu/site-menu";
import { useIdentity } from "../../hooks/use-identity";
import { useAppSelector } from "../../stores/hooks";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { ClearButton } from "./clear-button";
import { getDateLabel, getMobileDateLabel } from "./search-dates";
import pageGlobal from "../../styles/features/search/search-page-global.module.css";
import styles from "../../styles/features/search/search-nav.module.css";
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
  const identity = useIdentity();
  const isMobileSheet = !!state.mobileView;
  const whatValue = state.whatText != null ? state.whatText : selection.display;
  const whereValue = state.whereText != null ? state.whereText : where.display;
  const hasDate = !!state.query.date || state.time !== "any";
  const mobileDateLabel = getMobileDateLabel(state);
  const mobileWhereLabel = where.display || "Current location";

  // the pill grows with the window, leaving room for the logo and the right rail
  const pillStyle = {
    "--pill-max": `${Math.min(880, viewportWidth - (viewportWidth < 1100 ? 300 : 360))}px`,
  } as CSSProperties;

  return (
    <nav ref={refs.nav} className={styles.nav}>
      <div className={joinClassNames(pageGlobal.navinner, styles.inner)}>
        <div className={joinClassNames(pageGlobal.navRail, styles.railLeft)}>
          <Link to="/" className={styles.logoLink}>
            <img
              src={getAssetUrl("logos/logo-crimson-sm.png")}
              alt="Tiwára's House"
              className={styles.logo}
            />
          </Link>
        </div>
        <div
          data-expanded="true"
          className={joinClassNames(pageGlobal.searchPill, styles.pill)}
          style={pillStyle}
        >
          <div
            className={joinClassNames(
              pageGlobal.spMobile,
              styles.mobileSummary,
            )}
          >
            <Link to="/" aria-label="Back" className={styles.mobileBack}>
              <ArrowLeft size={20} strokeWidth={2} />
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
          <div className={joinClassNames(pageGlobal.hsField, styles.field)}>
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
          <div className={joinClassNames(pageGlobal.hsField, styles.field)}>
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
                  isLoading={where.isLoading}
                  isEmpty={where.isEmpty}
                  emptyText={where.emptyText}
                  onPick={actions.pickLocation}
                  onHover={actions.hoverWhere}
                />
              </div>
            )}
          </div>
          <div className={joinClassNames(pageGlobal.hsField, styles.dateField)}>
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
            className={joinClassNames(pageGlobal.spBtn, styles.searchButton)}
          >
            <Search size={17} strokeWidth={2} />
            <span
              className={joinClassNames(pageGlobal.spLabel, styles.searchLabel)}
            >
              Search
            </span>
          </button>
        </div>
        <div className={joinClassNames(pageGlobal.navRail, styles.railRight)}>
          {loggedIn && (
            <Link
              to="/account?section=favourites"
              aria-label="Favourites"
              title="Favourites"
              className={styles.favourites}
            >
              <Heart size={20} strokeWidth={2} />
            </Link>
          )}
          {loggedIn ? (
            <SiteMenu isSignedIn>
              <AccountAvatar initials={identity?.initials ?? ""} />
            </SiteMenu>
          ) : (
            <SiteMenu isSignedIn={false} className={styles.menuButton}>
              <span className={styles.menuLine}></span>
              <span className={styles.menuLine}></span>
            </SiteMenu>
          )}
        </div>
      </div>
    </nav>
  );
};
