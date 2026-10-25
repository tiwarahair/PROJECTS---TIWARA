import { Flag } from "lucide-react";
import { ActionMenuButton } from "../../components/action-menu";
import { ReviewCard } from "../../components/review-card";
import type { PublicReview } from "../../lib/review-api";

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
      is_checking: isChecking,
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
        isChecking={isChecking}
        reply={reply}
        isReplyEdited={isReplyEdited}
        stylistName={stylistName}
        tag={
          !isMine && (
            <ActionMenuButton
              label="More options for this review"
              title={`${author}’s review`}
              subtitle={serviceName}
              items={[
                {
                  label: "Report review",
                  icon: Flag,
                  run: () => onReport(id),
                },
              ]}
            />
          )
        }
      />
    ),
  );
