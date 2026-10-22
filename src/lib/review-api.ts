// Reviews: the client's review page (by the emailed link), a profile's public reviews and reporting one.
import { invokeBookingFunction } from "./booking-api";
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

export interface ReviewDraft {
  token: string;
  rating: number;
  body: string;
}

export interface PublicReview {
  id: string;
  rating: number;
  body: string | null;
  is_text_removed: boolean;
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
  invokeBookingFunction<ReviewPage>("booking-review", {
    action: "view",
    token,
  });

export const submitReview = ({ token, rating, body }: ReviewDraft) =>
  invokeBookingFunction<ReviewPage>("booking-review", {
    action: "submit",
    token,
    rating,
    body: body.trim() || null,
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
