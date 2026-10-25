import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { ActionToast } from "../../components/action-toast";
import { useIdentity } from "../../hooks/use-identity";
import { useMediaQuery } from "../../hooks/use-media-query";
import {
  AppShell,
  AppShellFooterNav,
  AppShellSidebar,
  AppShellTopBar,
} from "../../components/app-shell";
import { useGetReportStatsQuery } from "./api";
import { AdminLog } from "./log";
import { AdminProfiles } from "./profiles";
import { AdminReports } from "./reports";
import { AdminPhoneHeader } from "./shell/headers";
import { ADMIN_TABS, getAdminTab } from "./shell/nav-items";
import type { AdminTab } from "./shell/nav-items";

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

  const goTo = (next: AdminTab) => setParams({ tab: next });

  const openProfile = (stylistId: string | null) =>
    setParams(
      stylistId ? { tab: "profiles", stylist: stylistId } : { tab: "profiles" },
    );

  const isSidebarShown = isSidebarOpen ?? isDesktop;

  const navItems = ADMIN_TABS.map(({ id, label, icon }) => ({
    id,
    label,
    icon,
    isOn: tab.id === id,
    onSelect: () => goTo(id),
    badge: id === "reports" ? openCount : 0,
  }));

  return (
    <AppShell
      label="Admin"
      isWide={isWide}
      sidebar={
        <AppShellSidebar
          label="Admin"
          isOpen={isSidebarShown}
          onToggle={() => setSidebarOpen(!isSidebarShown)}
          items={navItems}
          hasLinksDivider
          links={
            isStylist
              ? [{ to: "/studio", label: "Back to Studio", icon: ArrowLeft }]
              : []
          }
          profile={{ name: identity?.name ?? "", area: "Admin" }}
        />
      }
      topBar={
        isWide ? (
          <AppShellTopBar
            title={tab.label}
            note={tab.note}
            isWide={isWide}
            isDesktop={isDesktop}
          />
        ) : (
          <AdminPhoneHeader
            isStylist={isStylist}
            initials={identity?.initials ?? ""}
          />
        )
      }
      footerNav={<AppShellFooterNav label="Admin" items={navItems} />}
      bodyId="adbody"
      overlays={<ActionToast />}
    >
      {tab.id === "reports" && (
        <AdminReports isWide={isWide} isDesktop={isDesktop} stats={stats} />
      )}
      {tab.id === "profiles" && (
        <AdminProfiles
          isWide={isWide}
          isDesktop={isDesktop}
          openId={params.get("stylist")}
          onOpen={openProfile}
        />
      )}
      {tab.id === "log" && (
        <AdminLog
          isWide={isWide}
          isDesktop={isDesktop}
          onOpenProfile={openProfile}
        />
      )}
    </AppShell>
  );
};
