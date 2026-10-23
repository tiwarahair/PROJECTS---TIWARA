import { useLayoutEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { ActionToast } from "../../components/action-toast";
import { useIdentity } from "../../hooks/use-identity";
import { useMediaQuery } from "../../hooks/use-media-query";
import { joinClassNames } from "../../utils/class-names";
import { useGetReportStatsQuery } from "./api";
import { AdminReports } from "./reports";
import { AdminFooterNav } from "./shell/footer-nav";
import { AdminPhoneHeader, AdminTopBar } from "./shell/headers";
import { getAdminTab } from "./shell/nav-items";
import type { AdminTab } from "./shell/nav-items";
import { AdminSidebar } from "./shell/sidebar";
import "../../styles/features/studio/global.module.css";
import styles from "../../styles/features/studio/shell/index.module.css";

interface AdminPageProps {
  isStylist: boolean;
}

export const AdminPage = ({ isStylist }: AdminPageProps) => {
  const isWide = useMediaQuery("(min-width:640px)");
  const isDesktop = useMediaQuery("(min-width:1024px)");
  const [isSidebarOpen, setSidebarOpen] = useState<boolean | null>(null);
  const [params, setParams] = useSearchParams();
  const identity = useIdentity();
  const tab = getAdminTab(params.get("tab"));
  const { data: stats } = useGetReportStatsQuery();
  // everything waiting for an admin: open reports and appeals
  const openCount = (stats?.open ?? 0) + (stats?.appealed ?? 0);

  useLayoutEffect(() => {
    document.documentElement.classList.add("studio-page");

    return () => document.documentElement.classList.remove("studio-page");
  }, []);

  const goTo = (next: AdminTab) => setParams({ tab: next });

  return (
    <div className={styles.studio} data-screen-label="Admin">
      <div className={joinClassNames(styles.frame, isWide && styles.frameWide)}>
        {isWide && (
          <AdminSidebar
            tab={tab.id}
            onTab={goTo}
            isOpen={isSidebarOpen ?? isDesktop}
            onToggle={() => setSidebarOpen(!(isSidebarOpen ?? isDesktop))}
            isStylist={isStylist}
            name={identity?.name ?? ""}
            openCount={openCount}
          />
        )}
        <div
          className={joinClassNames(
            styles.mainCard,
            isWide && styles.mainCardWide,
          )}
          data-screen-label="Main card"
        >
          {isWide ? (
            <AdminTopBar
              title={tab.label}
              note={tab.note}
              isDesktop={isDesktop}
            />
          ) : (
            <AdminPhoneHeader
              isStylist={isStylist}
              initials={identity?.initials ?? ""}
            />
          )}
          <div className={styles.body} id="adbody">
            {tab.id === "reports" && (
              <AdminReports
                isWide={isWide}
                isDesktop={isDesktop}
                stats={stats}
              />
            )}
          </div>
          {!isWide && (
            <AdminFooterNav tab={tab.id} onTab={goTo} openCount={openCount} />
          )}
          <ActionToast />
        </div>
      </div>
    </div>
  );
};
