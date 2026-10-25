import { useState } from "react";
import { CountTabs } from "../../../components/count-tabs";
import { EmptyBox } from "../../../components/empty-box";
import { ListSkeleton } from "../../../components/list-skeleton";
import { PageMessage } from "../../../components/page-message";
import { SortMenu } from "../../../components/sort-menu";
import { StatCards } from "../../../components/stat-cards";
import type {
  AdminReport,
  AdminReportStats,
  ReportsSort,
  ReportsTab,
} from "../../../lib/admin-api";
import { joinClassNames } from "../../../utils/class-names";
import { useGetReportsInfiniteQuery } from "../api";
import { getCount } from "../profiles/view";
import { DecisionSheet } from "./decision-sheet";
import { ReportRow } from "./row";
import { getDefaultSort, getTabs, SORTS } from "./view";
import list from "../../../styles/components/list-panel/index.module.css";
import page from "../../../styles/features/studio/reviews/index.module.css";
import shell from "../../../styles/features/admin/shell.module.css";
import styles from "../../../styles/features/admin/page.module.css";

const EMPTY: Record<ReportsTab, { title: string; body: string }> = {
  open: {
    title: "No open reports",
    body: "You’re all caught up. Harmful reports are emailed to the team straight away.",
  },
  hidden: {
    title: "Nothing hidden",
    body: "Reviews reported as abusive, private details or a threat wait here until you decide.",
  },
  appealed: {
    title: "No appeals waiting",
    body: "When a reviewer or stylist asks you to look again, it shows here.",
  },
  decided: {
    title: "Nothing decided yet",
    body: "Decisions show here with who made them and why.",
  },
};

interface AdminReportsProps {
  isWide: boolean;
  isDesktop: boolean;
  stats: AdminReportStats | null | undefined;
}

/** Admin → Reports: stats, the four tabs, and the reported reviews with their decide sheet. */
export const AdminReports = ({
  isWide,
  isDesktop,
  stats,
}: AdminReportsProps) => {
  const [tab, setTab] = useState<ReportsTab>("open");
  const [sort, setSort] = useState<ReportsSort>("oldest");
  const [isSortOpen, setSortOpen] = useState(false);
  const [deciding, setDeciding] = useState<AdminReport | null>(null);

  const {
    data,
    isError,
    isFetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useGetReportsInfiniteQuery({ tab, sort });

  const reports =
    data?.pages.flatMap((reportsPage) => reportsPage?.items ?? []) ?? [];

  const pickTab = (next: ReportsTab) => {
    setTab(next);
    setSort(getDefaultSort(next));
  };

  const statCards = [
    {
      label: isWide ? "Open reports" : "Open",
      value: stats?.open,
      sub: `${stats?.hidden ?? 0} hidden while checking`,
    },
    {
      label: "Overdue",
      value: stats?.overdue,
      sub: "Overdue within 24h or 5 working days",
      isAlert: !!stats?.overdue,
    },
    {
      label: isWide ? "Decided this week" : "This week",
      value: stats?.decided_this_week,
      sub: "Kept, or the words or review removed",
    },
  ];

  const total = data?.pages[0]?.total;

  const sortMenu = (
    <SortMenu
      label="Sort"
      ariaLabel="Sort reports"
      options={SORTS}
      value={sort}
      isOpen={isSortOpen}
      onToggle={() => setSortOpen(!isSortOpen)}
      onClose={() => setSortOpen(false)}
      onPick={(next) => {
        setSort(next);
        setSortOpen(false);
      }}
      align="right"
    />
  );

  const getList = () => {
    if (isError && !data)
      return (
        <PageMessage
          title="Reports didn’t load"
          text="Check your connection, then try again."
          linkLabel="Try again"
          linkHref="/admin"
          isReload
        />
      );

    if (!data) return <ListSkeleton isWide={isWide} />;

    if (!reports.length)
      return (
        <EmptyBox
          {...EMPTY[tab]}
          action={tab === "decided" ? "See open reports" : "See decided"}
          onAction={() => pickTab(tab === "decided" ? "open" : "decided")}
        />
      );

    return (
      <>
        <div
          className={isWide ? list.panel : list.cards}
          aria-busy={isFetching}
        >
          {reports.map((report) => (
            <ReportRow
              key={report.id}
              report={report}
              tab={tab}
              isCard={!isWide}
              onDecide={() => setDeciding(report)}
            />
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
        styles.page,
      )}
      data-screen-label="Admin: Reports"
    >
      {!isWide && <h1 className={shell.pageTitle}>Reports</h1>}
      <StatCards
        isWide={isWide}
        cards={statCards.map(({ sub, value, ...card }) => ({
          ...card,
          value,
          isLoading: value == null,
          sub: isWide ? sub : undefined,
        }))}
      />
      <div className={styles.tabsRow}>
        <div className={styles.tabs}>
          <CountTabs
            label="Reports"
            idPrefix="ad-rp"
            tabs={getTabs(stats)}
            active={tab}
            onChange={pickTab}
          />
        </div>
        {isWide && sortMenu}
      </div>
      {!isWide && (
        <div className={styles.sortRow}>
          <p className={styles.count}>
            {total == null ? "" : getCount(total, "report")}
          </p>
          {sortMenu}
        </div>
      )}
      {getList()}
      {!!deciding && (
        <DecisionSheet report={deciding} onClose={() => setDeciding(null)} />
      )}
    </div>
  );
};
