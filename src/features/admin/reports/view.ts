// Reports: tabs, labels, and when each report was made and is due.
import type {
  AdminReport,
  AdminReportEntry,
  AdminReportStats,
  ReportsSort,
  ReportsTab,
} from "../../../lib/admin-api";
import type { ReportReason, ReviewOutcome } from "../../../lib/review-api";
import { formatReviewDate } from "../../../utils/review-date";

export const REASONS: Record<ReportReason, string> = {
  abusive: "Abusive",
  personal_info: "Personal info",
  conflict: "Conflict of interest",
  spam: "Spam",
  threat: "Threat",
  other: "Other",
};

export const OUTCOMES: Record<ReviewOutcome, string> = {
  kept: "Kept the review",
  text_removed: "Removed the words",
  removed: "Removed the review",
};

export const SORTS = [
  ["oldest", "Oldest"],
  ["newest", "Newest"],
] as const;

const TAB_LABELS: [ReportsTab, string][] = [
  ["open", "Open"],
  ["hidden", "Hidden"],
  ["appealed", "Appealed"],
  ["decided", "Decided"],
];

/** decided reviews read newest first; everything waiting reads oldest first */
export const getDefaultSort = (tab: ReportsTab): ReportsSort =>
  tab === "decided" ? "newest" : "oldest";

export const getTabs = (stats: AdminReportStats | null | undefined) =>
  TAB_LABELS.map(([id, label]) => ({ id, label, count: stats?.[id] ?? 0 }));

const londonTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const londonDay = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  weekday: "short",
  day: "numeric",
  month: "short",
});

export const formatWhen = (iso: string) => londonTime.format(new Date(iso));

const HOUR = 3_600_000;

const getAgo = (iso: string, now: Date) => {
  const hours = Math.floor((now.getTime() - new Date(iso).getTime()) / HOUR);

  if (hours < 1) return "just now";

  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const text = formatReviewDate(iso, now.toISOString());

  return text.endsWith("ago") ? text.toLowerCase() : `on ${text}`;
};

/** "Reported 8 days ago" (or Appealed / Decided, by tab) */
export const getAgeText = (
  report: AdminReport,
  tab: ReportsTab,
  now = new Date(),
) => {
  const verb: Record<ReportsTab, string> = {
    open: "Reported",
    hidden: "Reported",
    appealed: "Appealed",
    decided: "Decided",
  };

  return `${verb[tab]} ${getAgo(report.sort_at, now)}`;
};

export const isOverdue = ({ due_at: dueAt }: AdminReport, now = new Date()) =>
  !!dueAt && new Date(dueAt) < now;

/** for the Overdue tooltip, or the age's tooltip when it isn't overdue yet */
export const getDueText = (report: AdminReport, now = new Date()) => {
  if (!report.due_at) return "";

  const due = new Date(report.due_at);

  if (due < now) return `Was due ${formatWhen(report.due_at)}`;

  const hours = Math.ceil((due.getTime() - now.getTime()) / HOUR);

  return hours <= 24
    ? `Due in ${hours} hour${hours === 1 ? "" : "s"}`
    : `Due ${londonDay.format(due)}`;
};

export const getReporter = ({
  is_stylist: isStylist,
  reporter_name: name,
}: Pick<AdminReportEntry, "is_stylist" | "reporter_name">) =>
  isStylist ? "the stylist" : `a client${name ? `, ${name}` : ""}`;
