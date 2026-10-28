import { Flag, ScrollText, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AdminTab = "reports" | "profiles" | "log";

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

export const ADMIN_TABS: AdminNavItem[] = [
  REPORTS,
  {
    id: "profiles",
    label: "Profiles",
    note: "Every stylist on Tiwára’s House",
    icon: Users,
  },
  {
    id: "log",
    label: "Action log",
    note: "Everything an admin has done",
    icon: ScrollText,
  },
];

export const getAdminTab = (value: string | null): AdminNavItem =>
  ADMIN_TABS.find(({ id }) => id === value) ?? REPORTS;

export const STUDIO_ADMIN_URL = "/admin?from=studio";

export const isFromStudio = (params: URLSearchParams) =>
  params.get("from") === "studio";

export const getAdminParams = (
  params: URLSearchParams,
  next: Record<string, string>,
) => (isFromStudio(params) ? { ...next, from: "studio" } : next);
