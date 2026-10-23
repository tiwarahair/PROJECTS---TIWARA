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
}: StudioReviews) => {
  const shown = reviews.filter(({ status }) => status !== "removed");

  return {
    rating,
    counted,
    total: shown.length,
    checking: shown.filter(
      ({ is_checking: isChecking, status }) =>
        isChecking || status === "hidden",
    ).length,
    replied: shown.filter(({ reply }) => !!reply).length,
  };
};

/** where a review stands after reports: beside the client's name */
export const getStatusTag = ({
  status,
  is_checking: isChecking,
  decision,
}: StudioReview) => {
  if (status === "removed") return "Removed · not shown or counted";

  if (status === "hidden") return "Hidden while we check · not in your rating";

  if (isChecking) return "Being checked · still counts";

  return decision === "kept" ? "Kept after checking" : "";
};

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
