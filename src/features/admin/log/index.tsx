import { ScrollText, Search, X } from "lucide-react";
import { useState } from "react";
import { Avatar } from "../../../components/ds/avatar";
import { EmptyBox } from "../../../components/empty-box";
import { ListSkeleton } from "../../../components/list-skeleton";
import { PageMessage } from "../../../components/page-message";
import { SortMenu } from "../../../components/sort-menu";
import { useDebouncedValue } from "../../../hooks/use-debounced-value";
import type { ActionsKindGroup, AdminAction } from "../../../lib/admin-api";
import { joinClassNames } from "../../../utils/class-names";
import { useGetActionFiltersQuery, useGetActionsInfiniteQuery } from "../api";
import { formatWhen } from "../reports/view";
import list from "../../../styles/components/list-panel/index.module.css";
import page from "../../../styles/features/studio/reviews/index.module.css";
import shell from "../../../styles/features/admin/shell.module.css";
import tabsRow from "../../../styles/features/admin/page.module.css";
import styles from "../../../styles/features/admin/log.module.css";

const KINDS = [
  ["all", "All actions"],
  ["reviews", "Reviews"],
  ["profiles", "Profiles"],
] as const satisfies readonly (readonly [ActionsKindGroup, string])[];

const getWhat = ({ kind, stylist_name: stylist }: AdminAction) => {
  const name = stylist ?? "a stylist";

  const what: Record<AdminAction["kind"], string> = {
    review_kept: "kept a review",
    review_text_removed: "removed the words of a review",
    review_removed: "removed a review",
    review_hidden: "hid a review while checking",
    appeal_kept: "kept a decision after an appeal",
    appeal_changed: "changed a decision after an appeal",
    profile_checked: "marked a profile as checked",
    stylist_suspended: `suspended ${name}`,
    stylist_unsuspended: `unsuspended ${name}`,
  };

  return what[kind];
};

type OpenMenu = "" | "admin" | "kind" | "stylist";

interface AdminLogProps {
  isWide: boolean;
  isDesktop: boolean;
  onOpenProfile: (stylistId: string) => void;
}

export const AdminLog = ({
  isWide,
  isDesktop,
  onOpenProfile,
}: AdminLogProps) => {
  const [adminId, setAdminId] = useState("all");
  const [kindGroup, setKindGroup] = useState<ActionsKindGroup>("all");
  const [stylistId, setStylistId] = useState("all");
  const [search, setSearch] = useState("");
  const [menu, setMenu] = useState<OpenMenu>("");
  const settledSearch = useDebouncedValue(search);
  const { data: filters } = useGetActionFiltersQuery();

  const {
    data,
    isError,
    isFetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useGetActionsInfiniteQuery({
    adminId: adminId === "all" ? null : adminId,
    kindGroup,
    stylistId: stylistId === "all" ? null : stylistId,
    search: settledSearch,
  });

  const actions =
    data?.pages.flatMap((actionsPage) => actionsPage?.items ?? []) ?? [];

  const admins = [
    ["all", "All admins"],
    ...(filters?.admins ?? []).map(({ id, name }) => [id, name]),
  ] as [string, string][];

  const stylists = [
    ["all", "All stylists"],
    ...(filters?.stylists ?? []).map(({ id, name }) => [id, name]),
  ] as [string, string][];

  const toggleMenu = (next: OpenMenu) => setMenu(menu === next ? "" : next);

  const clearFilters = () => {
    setAdminId("all");
    setKindGroup("all");
    setStylistId("all");
    setSearch("");
  };

  const getTarget = (action: AdminAction) => {
    const {
      review_id: reviewId,
      reviewer_name: reviewer,
      stylist_name: stylist,
      target_stylist_id: targetId,
    } = action;

    if (reviewId)
      return (
        <span className={styles.target}>
          {`${reviewer || "A client"}’s review of ${stylist ?? "a stylist"}`}
        </span>
      );

    if (!targetId) return null;

    return (
      <button
        type="button"
        className={styles.targetLink}
        onClick={() => onOpenProfile(targetId)}
      >
        {stylist}
      </button>
    );
  };

  const getList = () => {
    if (isError && !data)
      return (
        <PageMessage
          title="The log didn’t load"
          text="Check your connection, then try again."
          linkLabel="Try again"
          linkHref="/admin?tab=log"
          isReload
        />
      );

    if (!data) return <ListSkeleton isWide={isWide} />;

    if (!actions.length)
      return (
        <EmptyBox
          icon={ScrollText}
          title="Nothing in the log matches"
          body="Decisions, checks and suspensions show here as admins make them."
          action="Clear filters"
          onAction={clearFilters}
        />
      );

    return (
      <>
        <div
          className={isWide ? list.panel : list.cards}
          aria-busy={isFetching}
        >
          {actions.map((action) => (
            <div
              key={action.id}
              className={joinClassNames(styles.row, !isWide && styles.card)}
            >
              <Avatar
                className={styles.avatar}
                name={action.admin_name}
                size={36}
                isDecorative
              />
              <div className={styles.text}>
                <div>
                  <b>{action.admin_name}</b> {getWhat(action)}
                </div>
                {getTarget(action)}
                <p className={styles.note}>{`“${action.note}”`}</p>
              </div>
              <span className={styles.when}>
                {formatWhen(action.created_at)}
              </span>
            </div>
          ))}
        </div>
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
      data-screen-label="Admin: Action log"
    >
      {!isWide && <h1 className={shell.pageTitle}>Action log</h1>}
      <div className={page.controls}>
        <label className={page.search}>
          <Search size={15} strokeWidth={1.5} />
          <input
            className={page.searchInput}
            placeholder="Search notes, admins, stylists or reviewers"
            aria-label="Search the action log"
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
      <div className={styles.filters}>
        <SortMenu
          label="Admin"
          isValueOnly={!isWide}
          pillText={!isWide && adminId === "all" ? "Admin" : undefined}
          ariaLabel="Filter by admin"
          options={admins}
          value={adminId}
          isSet={adminId !== "all"}
          isOpen={menu === "admin"}
          onToggle={() => toggleMenu("admin")}
          onClose={() => setMenu("")}
          onPick={(next) => {
            setAdminId(next);
            setMenu("");
          }}
          align="left"
        />
        <SortMenu
          label="Action"
          isValueOnly={!isWide}
          pillText={!isWide && kindGroup === "all" ? "Action" : undefined}
          ariaLabel="Filter by type of action"
          options={KINDS}
          value={kindGroup}
          isSet={kindGroup !== "all"}
          isOpen={menu === "kind"}
          onToggle={() => toggleMenu("kind")}
          onClose={() => setMenu("")}
          onPick={(next) => {
            setKindGroup(next);
            setMenu("");
          }}
          align="left"
        />
        <SortMenu
          label="Stylist"
          isValueOnly={!isWide}
          pillText={!isWide && stylistId === "all" ? "Stylist" : undefined}
          ariaLabel="Filter by stylist"
          options={stylists}
          value={stylistId}
          isSet={stylistId !== "all"}
          isOpen={menu === "stylist"}
          onToggle={() => toggleMenu("stylist")}
          onClose={() => setMenu("")}
          onPick={(next) => {
            setStylistId(next);
            setMenu("");
          }}
          align="left"
        />
      </div>
      {getList()}
    </div>
  );
};
