import { describe, expect, it } from "vitest";
import type { StudioReview } from "../../../../lib/studio-api/reviews";
import { getReviewStats, getStatusTag, getVisibleReviews } from "../view";

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
  is_checking: false,
  is_reported: false,
  status: "published",
  decision: null,
  appeal_state: null,
  appeal_until: null,
  ...patch,
});

const REVIEWS = [
  review("a", 3, "2026-10-01T10:00:00Z", { reply: "Thanks!" }),
  review("b", 5, "2026-10-03T10:00:00Z"),
  review("c", 1, "2026-10-02T10:00:00Z", {
    is_counted: false,
    is_checking: true,
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

  it("says where a review stands after it was reported", () => {
    const tag = (patch: Partial<StudioReview>) =>
      getStatusTag(review("x", 2, "2026-10-01T10:00:00Z", patch));

    expect(tag({ status: "removed" })).toBe("Removed · not shown or counted");

    expect(tag({ status: "hidden" })).toBe(
      "Hidden while we check · not in your rating",
    );

    expect(tag({ is_checking: true })).toBe("Being checked · still counts");
    expect(tag({ decision: "kept" })).toBe("Kept after checking");
    expect(tag({})).toBe("");
  });

  it("leaves removed reviews out of the counts", () => {
    expect(
      getReviewStats({
        rating: null,
        review_count: 1,
        reviews: [
          review("a", 4, "2026-10-01T10:00:00Z"),
          review("b", 1, "2026-10-02T10:00:00Z", { status: "removed" }),
        ],
      }).total,
    ).toBe(1);
  });
});
