import {
  Calendar,
  Ellipsis,
  House,
  PoundSterling,
  Scissors,
  Settings,
  Star,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { StudioTab } from "../core/types";
import type { StudioController } from "../core/use-studio";

interface NavDefinition {
  id: StudioTab;
  label: string;
  icon: LucideIcon;
}

const MAIN_TABS: NavDefinition[] = [
  { id: "home", label: "Home", icon: House },
  { id: "bookings", label: "Bookings", icon: Calendar },
  { id: "services", label: "Services", icon: Scissors },
  { id: "earnings", label: "Earnings", icon: PoundSterling },
];

const WIDE_TABS: NavDefinition[] = [
  { id: "clients", label: "Clients", icon: Users },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "settings", label: "Settings", icon: Settings },
];

const NARROW_TABS: NavDefinition[] = [
  { id: "settings", label: "More", icon: Ellipsis },
];

/** The navigation entries and which one is current. */
export const getNavItems = (studio: StudioController) => {
  const { state, isWide, setState, actions } = studio;

  return [...MAIN_TABS, ...(isWide ? WIDE_TABS : NARROW_TABS)].map(
    (navDefinition) => ({
      ...navDefinition,
      isOn:
        state.tab === navDefinition.id ||
        (!isWide &&
          navDefinition.id === "settings" &&
          (state.tab === "clients" || state.tab === "reviews")),
      onSelect: () => {
        setState({ tab: navDefinition.id, selectedClientId: null, page: null });
        actions.scrollBody(0, false);

        if (navDefinition.id === "bookings" && state.bookingsLayout !== "list")
          actions.scrollCalendarToNow();
      },
    }),
  );
};
