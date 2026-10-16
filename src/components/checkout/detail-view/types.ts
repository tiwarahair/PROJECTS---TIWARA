import type { LucideIcon } from "lucide-react";
import type { DetailRow } from "../view";

export type Tone = "green" | "rust" | "red" | "neutral";

export interface Badge {
  label: string;
  icon: LucideIcon;
  tone: Tone;
}

export interface DetailAction {
  label: string;
  run: () => void;
  kind: "primary" | "secondary" | "ghost";
}

export interface DetailLink {
  key: string;
  label: string;
  icon: LucideIcon;
  run: () => void;
}

export interface DetailPanel {
  tone: "red" | "neutral";
  icon: LucideIcon;
  title: string;
  body: string;
}

export interface Detail {
  badges: Badge[];
  panel: DetailPanel | null;
  rows: DetailRow[];
  total: { label: string; value: string };
  links: DetailLink[];
  actions: DetailAction[];
  hasUndo: boolean;
}

export const TONES: Record<Tone, { foreground: string; background: string }> = {
  green: { foreground: "#2f7a4d", background: "rgba(47,122,77,.10)" },
  rust: { foreground: "var(--accent-500)", background: "rgba(181,84,31,.10)" },
  red: { foreground: "var(--accent-700)", background: "var(--accent-wash)" },
  neutral: {
    foreground: "var(--neutral-700)",
    background: "var(--fill-quiet)",
  },
};
