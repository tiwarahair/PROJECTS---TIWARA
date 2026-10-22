import { ReviewCard } from "../../components/review-card";
import type { PublicReview } from "../../lib/review-api";
import { ReviewMenu } from "./review-menu";

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
      is_former: isFormer,
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
        isFormer={isFormer}
        rating={rating}
        createdAt={createdAt}
        serviceName={serviceName}
        body={body}
        isTextRemoved={isTextRemoved}
        reply={reply}
        isReplyEdited={isReplyEdited}
        stylistName={stylistName}
        tag={!isMine && <ReviewMenu onReport={() => onReport(id)} />}
      />
    ),
  );
