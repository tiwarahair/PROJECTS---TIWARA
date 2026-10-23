import type { LucideIcon } from "lucide-react";

export interface AppShellNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  isOn: boolean;
  onSelect: () => void;
  /** a count beside the item, e.g. open reports */
  badge?: number;
}

export interface AppShellLink {
  to: string;
  label: string;
  icon: LucideIcon;
}
