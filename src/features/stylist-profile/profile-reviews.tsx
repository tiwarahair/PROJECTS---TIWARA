import { Star } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { ReportReview } from "../../components/report-review";
import { Sheet } from "../../components/sheet";
import { useIdentity } from "../../hooks/use-identity";
import { useLoadMore } from "../../hooks/use-load-more";
import { useGetStylistReviewsInfiniteQuery } from "../../stores/api-slice";
import { getLoginHref } from "./profile-facts";
import { ReviewList } from "./review-list";
import styles from "../../styles/features/stylist-profile/profile-reviews.module.css";

const PREVIEW_COUNT = 3;

interface ProfileReviewsProps {
  slug: string;
  stylistName: string;
  rating: number;
  reviews: number;
}

interface ScoreProps {
  rating: number;
  reviews: number;
}

const Score = ({ rating, reviews }: ScoreProps) =>
  !!reviews && (
    <span className={styles.score}>
      <Star size={18} strokeWidth={0} fill="var(--brand-yellow)" />
      {rating.toFixed(1)}
      <span className={styles.count}>{`(${reviews})`}</span>
    </span>
  );

/**
 * The newest reviews, and "Show all" opening every review in a sheet that loads more as it scrolls.
 * Signed-in visitors can report a review; guests log in first.
 */
export const ProfileReviews = ({
  slug,
  stylistName,
  rating,
  reviews,
}: ProfileReviewsProps) => {
  const identity = useIdentity();
  const navigate = useNavigate();
  const [isAllOpen, setAllOpen] = useState(false);
  const [reportingId, setReportingId] = useState("");

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useGetStylistReviewsInfiniteQuery(slug);

  const sentinelRef = useLoadMore(
    () => void fetchNextPage(),
    isAllOpen && hasNextPage && !isFetchingNextPage,
  );

  const total = data?.pages[0]?.total ?? 0;
  const shown = data?.pages.flatMap(({ reviews: page }) => page) ?? [];

  if (!total) return null;

  const report = (reviewId: string) => {
    if (identity) setReportingId(reviewId);
    else void navigate(getLoginHref(slug));
  };

  return (
    <section className={styles.section} aria-labelledby="profile-reviews">
      <div className={styles.header}>
        <h2 id="profile-reviews" className={styles.title}>
          Reviews
        </h2>
        <Score rating={rating} reviews={reviews} />
      </div>
      <ReviewList
        reviews={shown.slice(0, PREVIEW_COUNT)}
        stylistName={stylistName}
        onReport={report}
      />
      {total > PREVIEW_COUNT && (
        <button
          type="button"
          className={styles.more}
          onClick={() => setAllOpen(true)}
        >
          {`Show all ${total} reviews`}
        </button>
      )}
      <Sheet
        open={isAllOpen}
        onClose={() => setAllOpen(false)}
        title="Reviews"
        aside={<Score rating={rating} reviews={reviews} />}
      >
        <div className={styles.sheetList}>
          <ReviewList
            reviews={shown}
            stylistName={stylistName}
            onReport={report}
          />
        </div>
        <div ref={sentinelRef} className={styles.sentinel}>
          {isFetchingNextPage && "Loading more reviews…"}
        </div>
      </Sheet>
      {!!reportingId && (
        <ReportReview
          reviewId={reportingId}
          onClose={() => setReportingId("")}
        />
      )}
    </section>
  );
};
