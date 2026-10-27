// Reviews: the client's review and appeal pages (by the emailed links), a profile's public reviews and reporting one.
import { invokeFunction } from "./invoke-function";
import { supabase } from "./supabase";

export interface ReviewPage {
  state: "open" | "reviewed" | "unavailable";
  ref: string;
  service_name: string;
  stylist_name: string;
  stylist_slug: string;
  starts_at: string;
  client_first: string | null;
  rating: number | null;
}

export type ReviewOutcome = "kept" | "text_removed" | "removed";

export interface AppealPage {
  state: "open" | "appealed" | "closed";
  stylist_name: string;
  service_name: string;
  starts_at: string;
  client_first: string | null;
  rating: number;
  outcome: ReviewOutcome | null;
  decided_at: string | null;
  appeal_until: string | null;
}

export interface ReviewDraft {
  token: string;
  rating: number;
  body: string;
}

export interface PublicReview {
  id: string;
  /** null while it's hidden for checking */
  rating: number | null;
  body: string | null;
  is_text_removed: boolean;
  is_checking: boolean;
  author: string;
  is_former: boolean; //  the reviewer deleted their account
  service_name: string;
  created_at: string;
  reply: string | null;
  replied_at: string | null;
  is_reply_edited: boolean;
  is_mine: boolean;
}

export interface PublicReviewsPage {
  /** every review still up, across all pages */
  total: number;
  reviews: PublicReview[];
}

export type ReportReason =
  "abusive" | "personal_info" | "conflict" | "spam" | "threat" | "other";

export interface ReviewReport {
  reviewId: string;
  reason: ReportReason;
  details: string;
}

export const REVIEWS_PAGE_SIZE = 10;

export const fetchReviewPage = (token: string) =>
  invokeFunction<ReviewPage>("booking-review", {
    action: "view",
    token,
  });

export const submitReview = ({ token, rating, body }: ReviewDraft) =>
  invokeFunction<ReviewPage>("booking-review", {
    action: "submit",
    token,
    rating,
    body: body.trim() || null,
  });

export const fetchAppealPage = (token: string) =>
  invokeFunction<AppealPage>("booking-review", {
    action: "view-appeal",
    token,
  });

export const submitAppeal = ({
  token,
  body,
}: {
  token: string;
  body: string;
}) =>
  invokeFunction<AppealPage>("booking-review", {
    action: "appeal",
    token,
    body: body.trim(),
  });

export const fetchStylistReviews = async (slug: string, page: number) => {
  const { data, error } = await supabase.rpc("get_stylist_reviews", {
    lookup: slug,
    page,
    page_size: REVIEWS_PAGE_SIZE,
  });

  if (error) throw error;

  // jsonb, which the generated types only know as Json
  return data as unknown as PublicReviewsPage;
};

export const reportReview = async ({
  reviewId,
  reason,
  details,
}: ReviewReport) => {
  const { data, error } = await supabase.rpc("report_review", {
    target: reviewId,
    reason,
    details: details.trim() || undefined,
  });

  if (error) throw error;

  return data as "reported" | "already_reported";
};
