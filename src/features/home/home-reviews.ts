// Review strip values from prototype Home renderVals (reviews, revAvg, revCount). No reviews section on the
// current page; kept from the prototype.
import { reviews, stylists } from "../../data";

export const getReviewCards = () =>
  reviews.map((review) => ({
    ...review,
    stars: [1, 2, 3, 4, 5].map((position) => ({
      fill:
        position <= (review.stars || 5)
          ? "var(--brand-yellow)"
          : "var(--neutral-300)",
    })),
  }));

const getTotals = () => {
  let reviewCount = 0;
  let weightedRating = 0;
  for (const { reviews: count, rating } of stylists) {
    reviewCount += count || 0;
    weightedRating += (rating || 0) * (count || 0);
  }
  return { reviewCount, weightedRating };
};

/** Review-weighted average rating, e.g. "4.8". */
export const getAverageRating = (): string => {
  if (!stylists.length) return "4.9";
  const { reviewCount, weightedRating } = getTotals();
  return reviewCount ? (weightedRating / reviewCount).toFixed(1) : "4.9";
};

/** Total review count, e.g. "1,089". */
export const getReviewCountLabel = (): string => {
  const { reviewCount } = getTotals();
  return reviewCount ? reviewCount.toLocaleString("en-GB") : "1,000";
};
