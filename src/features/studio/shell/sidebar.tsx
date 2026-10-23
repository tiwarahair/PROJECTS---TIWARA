import { ShieldCheck } from "lucide-react";
import { AppShellSidebar } from "../../../components/app-shell";
import { useAppSelector } from "../../../stores/hooks";
import type { StudioController } from "../core/use-studio";
import { getNavItems } from "./nav-items";

export const StudioSidebar = ({ studio }: { studio: StudioController }) => {
  const { state, isDesktop, setState } = studio;
  const isOpen = state.sidebarOpen ?? isDesktop;
  const isAdmin = useAppSelector(({ session }) => !!session.user?.isAdmin);

  return (
    <AppShellSidebar
      label="Studio"
      isOpen={isOpen}
      onToggle={() => setState({ sidebarOpen: !isOpen })}
      items={getNavItems(studio)}
      links={
        isAdmin ? [{ to: "/admin", label: "Admin", icon: ShieldCheck }] : []
      }
      profile={{
        name: state.owner.first,
        fullName: state.owner.name,
        area: state.owner.area,
        avatarUrl: state.avatarUrl ?? undefined,
        onClick: () => setState({ tab: "settings", page: null }),
      }}
    />
  );
};
