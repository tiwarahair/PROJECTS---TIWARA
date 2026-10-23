import { Flag } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AdminTab = "reports";

interface AdminNavItem {
  id: AdminTab;
  label: string;
  note: string; //  under the title in the desktop top bar
  icon: LucideIcon;
}

const REPORTS: AdminNavItem = {
  id: "reports",
  label: "Reports",
  note: "Reported reviews and appeals",
  icon: Flag,
};

export const ADMIN_TABS: AdminNavItem[] = [REPORTS];

export const getAdminTab = (value: string | null): AdminNavItem =>
  ADMIN_TABS.find(({ id }) => id === value) ?? REPORTS;
