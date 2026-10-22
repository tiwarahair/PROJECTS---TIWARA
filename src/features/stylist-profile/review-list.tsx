import { Flag } from "lucide-react";
import { ReviewCard } from "../../components/review-card";
import type { PublicReview } from "../../lib/review-api";
import styles from "../../styles/features/stylist-profile/profile-reviews.module.css";

interface ReviewListProps {
  reviews: PublicReview[];
  stylistName: string;
  onReport: (reviewId: string) => void;
}

/** Public reviews; anyone but the reviewer can report one. */
export const ReviewList = ({
  reviews,
  stylistName,
  onReport,
}: ReviewListProps) =>
  reviews.map(
    ({
      id,
      author,
      rating,
      created_at: createdAt,
      service_name: serviceName,
      body,
      is_text_removed: isTextRemoved,
      reply,
      is_reply_edited: isReplyEdited,
      is_mine: isMine,
    }) => (
      <ReviewCard
        key={id}
        author={author}
        rating={rating}
        createdAt={createdAt}
        serviceName={serviceName}
        body={body}
        isTextRemoved={isTextRemoved}
        reply={reply}
        isReplyEdited={isReplyEdited}
        stylistName={stylistName}
        actions={
          !isMine && (
            <button
              type="button"
              className={styles.report}
              onClick={() => onReport(id)}
            >
              <Flag size={13} strokeWidth={1.8} />
              Report
            </button>
          )
        }
      />
    ),
  );
