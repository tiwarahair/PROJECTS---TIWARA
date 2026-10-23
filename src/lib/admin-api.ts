// Admin: reported reviews, decisions and appeals. Every call needs an admin with a two-step code entered.
import type { ReportReason, ReviewOutcome } from "./review-api";
import { supabase } from "./supabase";

export type ReportsTab = "open" | "hidden" | "appealed" | "decided";

export type ReportsSort = "oldest" | "newest";

export type DecisionOutcome = ReviewOutcome | "hidden";

export interface AdminReportStats {
  open: number;
  hidden: number;
  appealed: number;
  decided: number;
  decided_this_week: number;
  overdue: number;
}

export interface AdminReportEntry {
  reason: ReportReason;
  details: string | null;
  is_stylist: boolean;
  /** null when the stylist reported it */
  reporter_name: string | null;
  status: "open" | "kept" | "text_removed" | "removed";
  created_at: string;
}

export interface AdminDecision {
  outcome: ReviewOutcome;
  note: string;
  admin_name: string;
  created_at: string;
}

export interface AdminAppeal {
  id: string;
  appellant: "reviewer" | "stylist";
  body: string;
  created_at: string;
}

export interface AdminReport {
  id: string;
  rating: number;
  /** the words as written, even when they've been removed from the profile */
  body: string | null;
  status: "published" | "text_removed" | "removed" | "hidden";
  created_at: string;
  service_name: string;
  client_name: string;
  stylist_id: string;
  stylist_name: string;
  stylist_slug: string;
  sort_at: string;
  due_at: string | null;
  reports: AdminReportEntry[];
  decision: AdminDecision | null;
  appeal: AdminAppeal | null;
}

export interface AdminReportsPage {
  total: number;
  items: AdminReport[];
}

export interface AdminReportsQuery {
  tab: ReportsTab;
  sort: ReportsSort;
}

export interface ReviewDecisionDraft {
  reviewId: string;
  outcome: DecisionOutcome;
  note: string;
}

export interface AppealAnswerDraft {
  appealId: string;
  /** "keep" keeps the decision; anything else replaces it */
  outcome: ReviewOutcome | "keep";
  note: string;
}

export const ADMIN_PAGE_SIZE = 20;

const run = async <T>(
  request: PromiseLike<{ data: unknown; error: Error | null }>,
) => {
  const { data, error } = await request;

  if (error) throw error;

  // jsonb, which the generated types only know as Json
  return data as T;
};

export const fetchReportStats = () =>
  run<AdminReportStats | null>(supabase.rpc("admin_get_report_stats"));

export const fetchReports = ({ tab, sort }: AdminReportsQuery, page: number) =>
  run<AdminReportsPage | null>(
    supabase.rpc("admin_get_reports", { tab, sort, page }),
  );

export const decideReview = ({
  reviewId,
  outcome,
  note,
}: ReviewDecisionDraft) =>
  run<null>(
    supabase.rpc("admin_decide_review", {
      target: reviewId,
      outcome,
      note: note.trim(),
    }),
  );

export const answerAppeal = ({ appealId, outcome, note }: AppealAnswerDraft) =>
  run<null>(
    supabase.rpc("admin_answer_appeal", {
      target: appealId,
      outcome,
      note: note.trim(),
    }),
  );
