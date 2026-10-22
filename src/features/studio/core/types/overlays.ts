import type { LucideIcon } from "lucide-react";
import type { BlockedTime } from "./availability";

export interface ConfirmDialog {
  title?: string;
  /** Shown in bold above the body. */
  emphasis?: string;
  body: string;
  yesLabel?: string;
  noLabel?: string;
  yes: () => void;
  onNo?: () => void;
  /** tapping outside does nothing */
  isBlocking?: boolean;
}

export interface ActionItem {
  label: string;
  icon: LucideIcon;
  subtitle?: string;
  disabled?: boolean;
  danger?: boolean;
  run: () => void;
}

interface ActionAnchor {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface ActionSheet {
  title: string;
  subtitle: string;
  anchor?: ActionAnchor | null;
  items: ActionItem[];
}

export interface Popover {
  kind?: "block";
  time?: string;
  x: number;
  y: number;
  warn?: boolean;
  title?: string;
  subtitle?: string;
  block?: BlockedTime;
}

export interface Tooltip {
  key: string;
  text: string;
  x: number;
  y: number;
  below?: boolean;
}

export interface StudioNotification {
  id?: string;
  at?: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  bookingId?: string;
  opensEarnings?: boolean;
  opensReviews?: boolean;
}
