import {
  BadgeCheck,
  ChevronRight,
  Flag,
  MessageSquare,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { StarRating } from "../../../components/star-rating";
import type { StudioReview } from "../../../lib/studio-api/reviews";
import { joinClassNames } from "../../../utils/class-names";
import { getInitials } from "../core/format";
import type { StudioClient } from "../core/types";
import { ReplyForm } from "./reply-form";
import { LONG_REVIEW } from "./view";
import styles from "../../../styles/features/studio/reviews/row.module.css";

const reviewDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

interface ReviewRowProps {
  review: StudioReview;
  client: StudioClient | undefined;
  isCard: boolean;
  isReplying: boolean;
  onReply: () => void;
  onCloseReply: () => void;
  onReport: () => void;
  onOpenClient: (clientId: string) => void;
}

const Avatar = ({
  client,
  name,
  isFormer,
}: {
  client: StudioClient | undefined;
  name: string;
  isFormer: boolean;
}) => {
  if (isFormer)
    return (
      <span className={joinClassNames(styles.avatar, styles.avatarFormer)}>
        <UserRound size={18} strokeWidth={1.7} />
      </span>
    );

  if (client?.img)
    return <img className={styles.avatar} src={client.img} alt="" />;

  return <span className={styles.avatar}>{getInitials(name)}</span>;
};

/** One review: the client (opening their card when linked), the stars, the words, the reply and the actions. */
export const ReviewRow = ({
  review: {
    client_name: name,
    is_former: isFormer,
    rating,
    created_at: createdAt,
    service_name: service,
    body,
    is_text_removed: isTextRemoved,
    reply,
    is_reply_edited: isReplyEdited,
    is_counted: isCounted,
    is_reported: isReported,
    id,
  },
  client,
  isCard,
  isReplying,
  onReply,
  onCloseReply,
  onReport,
  onOpenClient,
}: ReviewRowProps) => {
  const [isExpanded, setExpanded] = useState(false);
  const clientId = client?.id;
  const isClamped = !!body && body.length > LONG_REVIEW && !isExpanded;

  const who = (
    <>
      <Avatar client={client} name={name} isFormer={isFormer} />
      <span className={styles.name}>{name}</span>
    </>
  );

  return (
    <article className={joinClassNames(styles.row, isCard && styles.card)}>
      <div className={styles.head}>
        {clientId ? (
          <button
            type="button"
            className={styles.who}
            aria-label={`Open ${name}’s client card`}
            onClick={() => onOpenClient(clientId)}
          >
            {who}
            <ChevronRight
              size={15}
              strokeWidth={2}
              className={styles.chevron}
            />
          </button>
        ) : (
          <span
            className={joinClassNames(styles.who, isFormer && styles.former)}
          >
            {who}
          </span>
        )}
        <span className={styles.verified}>
          <BadgeCheck size={14} strokeWidth={2} />
          Verified booking
        </span>
        {!isCounted && (
          <span className={styles.checking}>
            Being checked · not in your rating
          </span>
        )}
      </div>
      <div className={styles.content}>
        <div className={styles.meta}>
          <StarRating rating={rating} />
          <span>{reviewDate.format(new Date(createdAt))}</span>
          <span aria-hidden="true">·</span>
          <span>{service}</span>
        </div>
        {!!body && (
          <p
            id={`review-${id}`}
            className={joinClassNames(styles.body, isClamped && styles.clamped)}
          >
            {body}
          </p>
        )}
        {isClamped && (
          <button
            type="button"
            className={styles.more}
            aria-controls={`review-${id}`}
            onClick={() => setExpanded(true)}
          >
            Read more
          </button>
        )}
        {isTextRemoved && (
          <p className={styles.removed}>
            The words were removed because they broke our review rules. The
            rating still counts.
          </p>
        )}
        {!!reply && !isReplying && (
          <div className={styles.reply}>
            <div className={styles.replyHead}>
              Your reply
              {isReplyEdited && <span className={styles.edited}>Edited</span>}
            </div>
            <p className={styles.replyText}>{reply}</p>
          </div>
        )}
        {isReplying ? (
          <ReplyForm reviewId={id} reply={reply ?? ""} onDone={onCloseReply} />
        ) : (
          <div className={styles.actions}>
            <button type="button" className={styles.action} onClick={onReply}>
              <MessageSquare size={15} strokeWidth={1.8} />
              {reply ? "Edit reply" : "Reply"}
            </button>
            {isReported ? (
              <span className={styles.reported}>Reported</span>
            ) : (
              <button
                type="button"
                className={joinClassNames(styles.action, styles.actionQuiet)}
                onClick={onReport}
              >
                <Flag size={14} strokeWidth={1.8} />
                Report
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};
