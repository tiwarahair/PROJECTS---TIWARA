import { BadgeCheck, UserRound } from "lucide-react";
import { ReviewRulesLink } from "../review-rules-link";
import type { ReactNode } from "react";
import { getInitials } from "../../utils/initials";
import { formatReviewDate } from "../../utils/review-date";
import { StarRating } from "../star-rating";
import styles from "../../styles/components/review-card/index.module.css";

interface ReviewCardProps {
  author: string;
  /** the reviewer deleted their account */
  isFormer?: boolean;
  /** null while it's hidden for checking */
  rating: number | null;
  createdAt: string;
  serviceName: string;
  body: string | null;
  isTextRemoved: boolean;
  /** hidden while it's checked: no stars, words or reply */
  isChecking?: boolean;
  reply: string | null;
  isReplyEdited: boolean;
  stylistName: string;
  /** Under the review, e.g. Report or Reply. */
  actions?: ReactNode;
  /** Top right of the card, e.g. a "⋯" button. */
  tag?: ReactNode;
}

/** One review: who, the stars and date, the words, and the stylist's reply. */
export const ReviewCard = ({
  author,
  isFormer = false,
  rating,
  createdAt,
  serviceName,
  body,
  isTextRemoved,
  isChecking = false,
  reply,
  isReplyEdited,
  stylistName,
  actions,
  tag,
}: ReviewCardProps) => (
  <article className={styles.card}>
    <header className={styles.head}>
      <span className={styles.avatar} aria-hidden="true">
        {isFormer ? (
          <UserRound size={18} strokeWidth={1.7} />
        ) : (
          getInitials(author)
        )}
      </span>
      <div className={styles.who}>
        <span className={styles.author}>{author}</span>
        <div className={styles.meta}>
          <span>{`${formatReviewDate(createdAt)} · ${serviceName}`}</span>
          <span className={styles.verified} title="Verified booking">
            <span className={styles.dot} aria-hidden="true">
              ·
            </span>
            <BadgeCheck size={13} strokeWidth={2} />
            <span className={styles.verifiedText}>Verified booking</span>
          </span>
        </div>
      </div>
      {rating != null && (
        <span className={styles.stars}>
          <StarRating rating={rating} />
        </span>
      )}
      {tag}
    </header>
    {!!body && <p className={styles.body}>{body}</p>}
    {isChecking && (
      <p className={styles.removed}>
        We’re checking this review because it was reported. It doesn’t count
        toward the rating while we check.
      </p>
    )}
    {isTextRemoved && (
      <p className={styles.removed}>
        The words were removed because they broke <ReviewRulesLink />. The
        rating still counts.
      </p>
    )}
    {!!reply && (
      <div className={styles.reply}>
        <div className={styles.replyHead}>
          {`Reply from ${stylistName}`}
          {isReplyEdited && <span className={styles.edited}>Edited</span>}
        </div>
        <p className={styles.replyText}>{reply}</p>
      </div>
    )}
    {actions}
  </article>
);
