import { LONG_MONTHS, SHORT_MONTHS } from "../../../utils/dates";
import { categoryColours } from "../../../data";
import {
  Archive,
  ArchiveRestore,
  Check,
  Copy,
  CreditCard,
  Link2,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Trash,
  TriangleAlert,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CategoryColour } from "../../../types/category-colour";

export const TIMES = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];
export const SLOT_TIMES = ["09:00", "10:30", "13:00", "15:30", "17:00"];
export const GATE_REASON =
  "Finish setting up your studio to turn on your booking link.";

interface BlockColour {
  id: string;
  label: string;
  hex: string;
  foreground?: string;
}

export const BLOCK_COLORS: BlockColour[] = [
  { id: "ink", label: "Blocked", hex: "#1a1714", foreground: "#5b544a" },
  { id: "purple", label: "Purple", hex: "#6b4fbb" },
  { id: "blue", label: "Blue", hex: "#3b6fd6" },
  { id: "green", label: "Green", hex: "#2e7d4f" },
  { id: "rust", label: "Rust", hex: "#b5541f" },
  { id: "grey", label: "Grey", hex: "#7d7465" },
];

/** "Sep" → "September", for Past's month headings. */
export const PAST_MONTHS: Record<string, string> = Object.fromEntries(
  SHORT_MONTHS.map((short, index) => [short, LONG_MONTHS[index] ?? short]),
);

interface PastTone {
  background: string;
  color: string;
  icon: LucideIcon;
  meta: string;
}

export const PAST_TONE: Record<string, PastTone> = {
  Completed: {
    background: "rgba(46,125,79,.1)",
    color: "#2e7d4f",
    icon: Check,
    meta: "Paid",
  },
  Cancelled: {
    background: "var(--neutral-100)",
    color: "var(--text-secondary)",
    icon: X,
    meta: "Refunded",
  },
  "No show": {
    background: "rgba(181,84,31,.12)",
    color: "var(--accent-500)",
    icon: TriangleAlert,
    meta: "Deposit kept",
  },
  "Payment failed": {
    background: "rgba(143,17,18,.08)",
    color: "var(--accent-700)",
    icon: CreditCard,
    meta: "Unpaid",
  },
};

export const ICONS = {
  edit: Pencil,
  copy: Copy,
  archive: Archive,
  restore: ArchiveRestore,
  trash: Trash,
  link: Link2,
};

export const CONTACT_ICONS = {
  call: Phone,
  text: MessageSquare,
  mail: Mail,
};

export const NO_CATEGORY_TONE = "var(--neutral-300,#d8d2c6)";

export const CATEGORY_COLOURS: CategoryColour[] = categoryColours;
