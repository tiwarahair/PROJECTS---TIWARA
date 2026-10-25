import { LayoutGrid, List, Search, Users, X } from "lucide-react";
import { useState } from "react";
import { CountTabs } from "../../../components/count-tabs";
import { EmptyBox } from "../../../components/empty-box";
import { ListSkeleton } from "../../../components/list-skeleton";
import { PageMessage } from "../../../components/page-message";
import { SortMenu } from "../../../components/sort-menu";
import { StatCards } from "../../../components/stat-cards";
import { StylistCard } from "../../../components/stylist-card";
import { useDebouncedValue } from "../../../hooks/use-debounced-value";
import type {
  ProfilesSort,
  ProfilesTab,
  ProfilesWentLive,
} from "../../../lib/admin-api";
import { toPhotoUrl } from "../../../lib/public-stylist";
import { joinClassNames } from "../../../utils/class-names";
import { useGetProfilesInfiniteQuery, useGetProfileStatsQuery } from "../api";
import { ProfileBadges } from "./badges";
import { ProfileRow } from "./row";
import { ProfileSheet } from "./profile-sheet";
import {
  getCardFoot,
  getCardMeta,
  getCount,
  getTabs,
  getWaitingNote,
  SORTS,
  WENT_LIVE,
} from "./view";
import list from "../../../styles/components/list-panel/index.module.css";
import page from "../../../styles/features/studio/reviews/index.module.css";
import shell from "../../../styles/features/admin/shell.module.css";
import tabsRow from "../../../styles/features/admin/page.module.css";
import styles from "../../../styles/features/admin/profiles.module.css";

interface AdminProfilesProps {
  isWide: boolean;
  isDesktop: boolean;
  openId: string | null;
  onOpen: (stylistId: string | null) => void;
}

type OpenMenu = "" | "live" | "sort";

export const AdminProfiles = ({
  isWide,
  isDesktop,
  openId,
  onOpen,
}: AdminProfilesProps) => {
  const [tab, setTab] = useState<ProfilesTab>("not");
  const [wentLive, setWentLive] = useState<ProfilesWentLive>("any");
  const [sort, setSort] = useState<ProfilesSort>("flags");
  const [search, setSearch] = useState("");
  const [menu, setMenu] = useState<OpenMenu>("");
  const [isGrid, setGrid] = useState(true);
  const settledSearch = useDebouncedValue(search);
  const { data: stats } = useGetProfileStatsQuery();

  const {
    data,
    isError,
    isFetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useGetProfilesInfiniteQuery({
    tab,
    wentLive,
    sort,
    search: settledSearch,
  });

  const profiles =
    data?.pages.flatMap((profilesPage) => profilesPage?.items ?? []) ?? [];

  const toggleMenu = (next: OpenMenu) => setMenu(menu === next ? "" : next);

  const clearFilters = () => {
    setTab("all");
    setWentLive("any");
    setSearch("");
  };

  const statCards = [
    {
      label: isWide ? "Waiting for a check" : "Waiting",
      value: stats?.not_checked,
      sub: getWaitingNote(stats),
      isAlert: !!stats?.not_checked,
    },
    {
      label: "Flagged",
      value: stats?.flagged,
      sub: `${stats?.multi_flagged ?? 0} with more than one flag`,
    },
    {
      label: isWide ? "Live stylists" : "Live",
      value: stats?.live,
      sub: `${stats?.suspended ?? 0} suspended`,
    },
  ];

  const layoutToggle = (
    <div className={styles.layout} role="group" aria-label="Layout">
      <button
        type="button"
        className={styles.layoutButton}
        aria-label="Grid"
        aria-pressed={isGrid}
        onClick={() => setGrid(true)}
      >
        <LayoutGrid size={16} strokeWidth={1.8} />
      </button>
      <button
        type="button"
        className={styles.layoutButton}
        aria-label="List"
        aria-pressed={!isGrid}
        onClick={() => setGrid(false)}
      >
        <List size={16} strokeWidth={1.8} />
      </button>
    </div>
  );

  const getList = () => {
    if (isError && !data)
      return (
        <PageMessage
          title="Profiles didn’t load"
          text="Check your connection, then try again."
          linkLabel="Try again"
          linkHref="/admin?tab=profiles"
          isReload
        />
      );

    if (!data) return <ListSkeleton isWide={isWide} />;

    if (!profiles.length)
      return (
        <EmptyBox
          icon={Users}
          title={
            tab === "not" && !settledSearch
              ? "Every profile is checked"
              : "No stylists match"
          }
          body={
            tab === "not" && !settledSearch
              ? "New stylists show here when they go live."
              : "Try another name or area, or look in All."
          }
          action="Show all stylists"
          onAction={clearFilters}
        />
      );

    return (
      <>
        {isGrid ? (
          <div className={styles.grid} aria-busy={isFetching}>
            {profiles.map((profile) => (
              <StylistCard
                key={profile.id}
                size="compact"
                hasFavourite={false}
                onOpen={() => onOpen(profile.id)}
                cover={profile.cover_path ? toPhotoUrl(profile.cover_path) : ""}
                stylistName={profile.business_name}
                rating={profile.rating ?? ""}
                reviews={profile.rating == null ? "" : profile.review_count}
                area={profile.area_label ?? ""}
                meta={getCardMeta(profile)}
                facts={[{ text: getCardFoot(profile) }]}
                badges={<ProfileBadges profile={profile} />}
              />
            ))}
          </div>
        ) : (
          <div
            className={isWide ? list.panel : list.cards}
            aria-busy={isFetching}
          >
            {isWide && (
              <div className={styles.header} aria-hidden="true">
                <span>Stylist</span>
                <span>Checks</span>
                <span>Activity</span>
                <span>Went live</span>
                <span>Status</span>
              </div>
            )}
            {profiles.map((profile) => (
              <ProfileRow
                key={profile.id}
                profile={profile}
                isCard={!isWide}
                onOpen={() => onOpen(profile.id)}
              />
            ))}
          </div>
        )}
        {hasNextPage && (
          <button
            type="button"
            className={list.showMore}
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage ? "Loading…" : "Show more"}
          </button>
        )}
      </>
    );
  };

  return (
    <div
      className={joinClassNames(
        page.reviews,
        isWide && page.wide,
        isDesktop && page.desk,
        tabsRow.page,
      )}
      data-screen-label="Admin: Profiles"
    >
      {!isWide && <h1 className={shell.pageTitle}>Profiles</h1>}
      <StatCards
        isWide={isWide}
        cards={statCards.map(({ sub, value, ...card }) => ({
          ...card,
          value,
          isLoading: value == null,
          sub: isWide ? sub : undefined,
        }))}
      />
      <CountTabs
        label="Profiles"
        idPrefix="ad-pf"
        tabs={getTabs(stats)}
        active={tab}
        onChange={setTab}
      />
      <div className={page.controls}>
        <label className={page.search}>
          <Search size={15} strokeWidth={1.5} />
          <input
            className={page.searchInput}
            placeholder="Search by stylist, business or area"
            aria-label="Search stylists by name, business or area"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {!!search && (
            <button
              type="button"
              className={page.clearSearch}
              aria-label="Clear search"
              onClick={() => setSearch("")}
            >
              <X size={15} strokeWidth={1.7} />
            </button>
          )}
        </label>
      </div>
      <div className={styles.toolbar}>
        {isWide && !!data && (
          <p className={styles.results}>
            {`${getCount(profiles.length, "stylist")}${hasNextPage ? " so far" : ""}`}
          </p>
        )}
        <div className={styles.tools}>
          <SortMenu
            label="Went live"
            ariaLabel="Filter by when they went live"
            options={WENT_LIVE}
            value={wentLive}
            isSet={wentLive !== "any"}
            isValueOnly={!isWide}
            pillText={!isWide && wentLive === "any" ? "Went live" : undefined}
            isOpen={menu === "live"}
            onToggle={() => toggleMenu("live")}
            onClose={() => setMenu("")}
            onPick={(next) => {
              setWentLive(next);
              setMenu("");
            }}
            align={isWide ? "right" : "left"}
          />
          <SortMenu
            label="Sort"
            ariaLabel="Sort stylists"
            isValueOnly={!isWide}
            options={SORTS}
            value={sort}
            isOpen={menu === "sort"}
            onToggle={() => toggleMenu("sort")}
            onClose={() => setMenu("")}
            onPick={(next) => {
              setSort(next);
              setMenu("");
            }}
            align={isWide ? "right" : "left"}
          />
          {layoutToggle}
        </div>
      </div>
      {getList()}
      {!!openId && (
        <ProfileSheet
          key={openId}
          stylistId={openId}
          onClose={() => onOpen(null)}
        />
      )}
    </div>
  );
};
