import { BadgeCheck } from "lucide-react";
import type { ReactNode } from "react";
import { StarRating } from "../star-rating";
import styles from "../../styles/components/review-card/index.module.css";

const reviewDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

interface ReviewCardProps {
  author: string;
  rating: number;
  createdAt: string;
  serviceName: string;
  body: string | null;
  isTextRemoved: boolean;
  reply: string | null;
  isReplyEdited: boolean;
  stylistName: string;
  /** Under the review, e.g. Report or Reply. */
  actions?: ReactNode;
  /** Above the stars, e.g. a "Being checked" tag. */
  tag?: ReactNode;
}

/** One review: who, the stars and date, the words, and the stylist's reply. */
export const ReviewCard = ({
  author,
  rating,
  createdAt,
  serviceName,
  body,
  isTextRemoved,
  reply,
  isReplyEdited,
  stylistName,
  actions,
  tag,
}: ReviewCardProps) => (
  <article className={styles.card}>
    <header className={styles.head}>
      <div className={styles.who}>
        <span className={styles.author}>{author}</span>
        <span className={styles.verified}>
          <BadgeCheck size={14} strokeWidth={2} />
          Verified booking
        </span>
      </div>
      {tag}
    </header>
    <div className={styles.meta}>
      <StarRating rating={rating} />
      <span>{reviewDate.format(new Date(createdAt))}</span>
      <span aria-hidden="true">·</span>
      <span>{serviceName}</span>
    </div>
    {!!body && <p className={styles.body}>{body}</p>}
    {isTextRemoved && (
      <p className={styles.removed}>
        The words were removed because they broke our review rules. The rating
        still counts.
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
