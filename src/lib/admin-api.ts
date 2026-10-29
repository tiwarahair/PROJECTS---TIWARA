// Admin: reported reviews, decisions and appeals; stylist profiles and suspensions; the action log. Every call needs an admin with a two-step code entered.
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
  reporter_deleted: boolean;
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

export type ProfilesTab = "all" | "not" | "flags" | "stripe" | "suspended";

export type ProfilesWentLive = "any" | "week" | "month";

export type ProfilesSort = "flags" | "newest" | "oldest" | "bookings";

export type ProfileFlag = "stripe" | "contact" | "prices" | "photos";

export type StripeState = "none" | "action" | "verifying" | "active";

export interface AdminProfileStats {
  all: number;
  not_checked: number;
  oldest_waiting: string | null;
  flagged: number;
  multi_flagged: number;
  stripe: number;
  live: number;
  suspended: number;
}

export interface AdminProfile {
  id: string;
  slug: string;
  business_name: string;
  owner_name: string;
  area_label: string | null;
  cover_path: string | null;
  status: string;
  went_live_at: string | null;
  suspended_at: string | null;
  flags: ProfileFlag[];
  /** flags that appeared since the last check */
  new_flags: ProfileFlag[];
  checked_at: string | null;
  checked_by_name: string | null;
  stripe_state: StripeState;
  service_count: number;
  min_pence: number | null;
  max_pence: number | null;
  photo_count: number;
  booking_count: number;
  cancelled_count: number;
  review_count: number;
  rating: number | null;
  reported_count: number;
}

export interface ContactMatch {
  kind: "phone" | "email";
  name: string;
}

export interface PriceOutlier {
  name: string;
  from_pence: number;
  usual_pence: number;
}

export interface AdminProfileDetail extends AdminProfile {
  owner_email: string | null;
  owner_phone: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  stripe_account_id: string | null;
  suspend_reason: string | null;
  suspended_by: string | null;
  note: string;
  contact_matches: ContactMatch[];
  price_outliers: PriceOutlier[];
}

export interface AdminProfilesQuery {
  tab: ProfilesTab;
  wentLive: ProfilesWentLive;
  sort: ProfilesSort;
  search: string;
}

export interface AdminPage<Item> {
  items: Item[];
  has_more: boolean;
}

export interface ProfileNoteDraft {
  stylistId: string;
  note: string;
}

export type ActionsKindGroup = "all" | "reviews" | "profiles";

export type AdminActionKind =
  | "review_kept"
  | "review_text_removed"
  | "review_removed"
  | "review_hidden"
  | "appeal_kept"
  | "appeal_changed"
  | "profile_checked"
  | "stylist_suspended"
  | "stylist_unsuspended";

export interface AdminAction {
  id: string;
  kind: AdminActionKind;
  note: string;
  created_at: string;
  review_id: string | null;
  admin_name: string;
  stylist_name: string | null;
  target_stylist_id: string | null;
  reviewer_name: string | null;
}

export interface AdminActionsQuery {
  adminId: string | null;
  kindGroup: ActionsKindGroup;
  stylistId: string | null;
  search: string;
}

export interface AdminActionFilters {
  admins: { id: string; name: string }[];
  stylists: { id: string; name: string }[];
}

export const fetchProfileStats = () =>
  run<AdminProfileStats | null>(supabase.rpc("admin_get_profile_stats"));

export const fetchProfiles = (
  { tab, wentLive, sort, search }: AdminProfilesQuery,
  page: number,
) =>
  run<AdminPage<AdminProfile> | null>(
    supabase.rpc("admin_get_profiles", {
      tab,
      went_live: wentLive,
      sort,
      search: search.trim(),
      page,
    }),
  );

export const fetchProfile = (stylistId: string) =>
  run<AdminProfileDetail | null>(
    supabase.rpc("admin_get_profile", { target: stylistId }),
  );

export const saveProfileNote = ({ stylistId, note }: ProfileNoteDraft) =>
  run<null>(
    supabase.rpc("admin_save_profile_note", { target: stylistId, note }),
  );

export const markProfileChecked = ({ stylistId, note }: ProfileNoteDraft) =>
  run<null>(
    supabase.rpc("admin_mark_profile_checked", {
      target: stylistId,
      note: note.trim(),
    }),
  );

export const suspendStylist = ({ stylistId, note }: ProfileNoteDraft) =>
  run<null>(
    supabase.rpc("admin_suspend_stylist", {
      target: stylistId,
      reason: note.trim(),
    }),
  );

export const unsuspendStylist = ({ stylistId, note }: ProfileNoteDraft) =>
  run<null>(
    supabase.rpc("admin_unsuspend_stylist", {
      target: stylistId,
      note: note.trim(),
    }),
  );

export const fetchActions = (
  { adminId, kindGroup, stylistId, search }: AdminActionsQuery,
  page: number,
) =>
  run<AdminPage<AdminAction> | null>(
    supabase.rpc("admin_get_actions", {
      by_admin: adminId ?? undefined,
      kind_group: kindGroup,
      for_stylist: stylistId ?? undefined,
      search: search.trim(),
      page,
    }),
  );

export const fetchActionFilters = () =>
  run<AdminActionFilters | null>(supabase.rpc("admin_get_action_filters"));
