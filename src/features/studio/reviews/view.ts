import type {
  StudioReview,
  StudioReviews,
} from "../../../lib/studio-api/reviews";

export type ReviewSort = "newest" | "oldest" | "highest" | "lowest";

export const SORT_OPTIONS: { value: ReviewSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "highest", label: "Highest rated" },
  { value: "lowest", label: "Lowest rated" },
];

export const PAGE_SIZE = 20;

/** longer reviews show 4 lines and "Read more" */
export const LONG_REVIEW = 260;

const byNewest = (first: StudioReview, second: StudioReview) =>
  second.created_at.localeCompare(first.created_at);

const SORTERS: Record<
  ReviewSort,
  (first: StudioReview, second: StudioReview) => number
> = {
  newest: byNewest,
  oldest: (first, second) => byNewest(second, first),
  highest: (first, second) =>
    second.rating - first.rating || byNewest(first, second),
  lowest: (first, second) =>
    first.rating - second.rating || byNewest(first, second),
};

export const getReviewStats = ({
  rating,
  review_count: counted,
  reviews,
}: StudioReviews) => ({
  rating,
  counted,
  total: reviews.length,
  checking: reviews.filter(({ is_counted: isCounted }) => !isCounted).length,
  replied: reviews.filter(({ reply }) => !!reply).length,
});

interface ReviewQuery {
  sort: ReviewSort;
  isRepliedOnly: boolean;
  search: string;
}

const isMatch = (
  { client_name: client, service_name: service, body }: StudioReview,
  search: string,
) =>
  [client, service, body ?? ""].some((text) =>
    text.toLowerCase().includes(search),
  );

export const getVisibleReviews = (
  reviews: StudioReview[],
  { sort, isRepliedOnly, search }: ReviewQuery,
) => {
  const query = search.trim().toLowerCase();

  return reviews
    .filter(({ reply }) => !isRepliedOnly || !!reply)
    .filter((review) => !query || isMatch(review, query))
    .sort(SORTERS[sort]);
};
