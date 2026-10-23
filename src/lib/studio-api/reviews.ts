import { supabase } from "../supabase";
import type { ReviewOutcome } from "../review-api";
import { check, write } from "./request";

export interface StudioReview {
  id: string;
  booking_id: string;
  ref: string;
  rating: number;
  body: string | null;
  status: "published" | "text_removed" | "removed" | "hidden";
  is_text_removed: boolean;
  client_name: string;
  /** the client deleted their account */
  is_former: boolean;
  /** their card in Studio's clients, when the booking is linked to one */
  stylist_client_id: string | null;
  service_name: string;
  starts_at: string;
  created_at: string;
  reply: string | null;
  replied_at: string | null;
  is_reply_edited: boolean;
  is_counted: boolean;
  is_checking: boolean;
  is_reported: boolean;
  /** the latest admin decision, if any */
  decision: ReviewOutcome | null;
  appeal_state: "open" | "appealed" | "closed" | null;
  appeal_until: string | null;
}

export interface StudioReviews {
  /** null until 3 reviews count */
  rating: number | null;
  review_count: number;
  reviews: StudioReview[];
}

export const fetchStudioReviews = async (stylistId: string) =>
  // jsonb, which the generated types only know as Json
  (await check(
    supabase.rpc("get_studio_reviews", { target: stylistId }),
  )) as unknown as StudioReviews;

export const replyToReview = ({
  reviewId,
  reply,
}: {
  reviewId: string;
  reply: string;
}) => write(supabase.rpc("reply_to_review", { target: reviewId, reply }));

export const appealReview = async ({
  reviewId,
  body,
}: {
  reviewId: string;
  body: string;
}) =>
  (await write(
    supabase.rpc("appeal_review_decision", {
      target: reviewId,
      body: body.trim(),
    }),
  )) as "appealed" | "closed";
