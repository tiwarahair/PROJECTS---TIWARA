import { describe, expect, it } from "vitest";
import type { StudioReview } from "../../../../lib/studio-api/reviews";
import { getReviewStats, getVisibleReviews } from "../view";

const review = (
  id: string,
  rating: number,
  createdAt: string,
  patch: Partial<StudioReview> = {},
): StudioReview => ({
  id,
  booking_id: `booking-${id}`,
  ref: `TH-${id}`,
  rating,
  body: null,
  is_text_removed: false,
  client_name: "Ada Lovelace",
  is_former: false,
  stylist_client_id: null,
  service_name: "Silk press",
  starts_at: createdAt,
  created_at: createdAt,
  reply: null,
  replied_at: null,
  is_reply_edited: false,
  is_counted: true,
  is_reported: false,
  ...patch,
});

const REVIEWS = [
  review("a", 3, "2026-10-01T10:00:00Z", { reply: "Thanks!" }),
  review("b", 5, "2026-10-03T10:00:00Z"),
  review("c", 1, "2026-10-02T10:00:00Z", {
    is_counted: false,
    service_name: "Knotless braids",
  }),
];

const ids = (reviews: StudioReview[]) => reviews.map(({ id }) => id);

describe("Studio reviews view", () => {
  it("sorts newest, oldest, highest and lowest", () => {
    const query = { isRepliedOnly: false, search: "" };

    expect(
      ids(getVisibleReviews([...REVIEWS], { ...query, sort: "newest" })),
    ).toEqual(["b", "c", "a"]);

    expect(
      ids(getVisibleReviews([...REVIEWS], { ...query, sort: "oldest" })),
    ).toEqual(["a", "c", "b"]);

    expect(
      ids(getVisibleReviews([...REVIEWS], { ...query, sort: "highest" })),
    ).toEqual(["b", "a", "c"]);

    expect(
      ids(getVisibleReviews([...REVIEWS], { ...query, sort: "lowest" })),
    ).toEqual(["c", "a", "b"]);
  });

  it("shows only replied-to reviews, and searches by service", () => {
    expect(
      ids(
        getVisibleReviews([...REVIEWS], {
          sort: "newest",
          isRepliedOnly: true,
          search: "",
        }),
      ),
    ).toEqual(["a"]);

    expect(
      ids(
        getVisibleReviews([...REVIEWS], {
          sort: "newest",
          isRepliedOnly: false,
          search: " KNOTLESS ",
        }),
      ),
    ).toEqual(["c"]);
  });

  it("counts reviews, replies and the ones being checked", () => {
    expect(
      getReviewStats({ rating: 4, review_count: 2, reviews: REVIEWS }),
    ).toEqual({ rating: 4, counted: 2, total: 3, checking: 1, replied: 1 });
  });
});
