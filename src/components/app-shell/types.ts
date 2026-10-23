import type { LucideIcon } from "lucide-react";

export interface AppShellNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  isOn: boolean;
  onSelect: () => void;
  badge?: number;
}

export interface AppShellLink {
  to: string;
  label: string;
  icon: LucideIcon;
}
