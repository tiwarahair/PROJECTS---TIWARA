import { useState } from "react";
import Skeleton from "react-loading-skeleton";
import { CountTabs } from "../../../components/count-tabs";
import { PageMessage } from "../../../components/page-message";
import { SortMenu } from "../../../components/sort-menu";
import type {
  AdminReport,
  AdminReportStats,
  ReportsSort,
  ReportsTab,
} from "../../../lib/admin-api";
import { joinClassNames } from "../../../utils/class-names";
import { EmptyBox, ReviewsSkeleton } from "../../studio/reviews/states";
import { useGetReportsInfiniteQuery } from "../api";
import { DecisionSheet } from "./decision-sheet";
import { ReportRow } from "./row";
import { getDefaultSort, getTabs, SORTS } from "./view";
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
      sub: "Harmful within 24h, others 5 working days",
      isAlert: !!stats?.overdue,
    },
    {
      label: isWide ? "Decided this week" : "This week",
      value: stats?.decided_this_week,
      sub: "Kept, or the words or review removed",
    },
  ];

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

    if (!data) return <ReviewsSkeleton />;

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
          className={isWide ? page.panel : page.cards}
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
            className={page.showMore}
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
      <div className={page.stats}>
        {statCards.map(({ label, value, sub, isAlert }) => (
          <div key={label} className={page.stat}>
            <span className={page.statLabel}>{label}</span>
            {value == null ? (
              <Skeleton width={36} height={26} />
            ) : (
              <span
                className={joinClassNames(
                  page.statValue,
                  isAlert && styles.alert,
                )}
              >
                {value}
              </span>
            )}
            {isWide && <span className={page.statSub}>{sub}</span>}
          </div>
        ))}
      </div>
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
        <div className={styles.sort}>
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
        </div>
      </div>
      {getList()}
      {!!deciding && (
        <DecisionSheet report={deciding} onClose={() => setDeciding(null)} />
      )}
    </div>
  );
};
