import {
  BadgeCheck,
  ChevronRight,
  Flag,
  MessageSquare,
  Scale,
  UserRound,
} from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { ReviewRulesLink } from "../../../components/review-rules-link";
import { StarRating } from "../../../components/star-rating";
import type { StudioReview } from "../../../lib/studio-api/reviews";
import { joinClassNames } from "../../../utils/class-names";
import { formatReviewDate } from "../../../utils/review-date";
import { getInitials } from "../../../utils/initials";
import type { StudioClient } from "../core/types";
import { AppealForm, ReplyForm } from "./reply-form";
import { getStatusTag } from "./view";
import styles from "../../../styles/features/studio/reviews/row.module.css";

interface ReviewRowProps {
  review: StudioReview;
  client: StudioClient | undefined;
  isCard: boolean;
  isReplying: boolean;
  onReply: () => void;
  onCloseReply: () => void;
  isAppealing: boolean;
  onAppeal: () => void;
  onCloseAppeal: () => void;
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

export const ReviewRow = ({
  review,
  client,
  isCard,
  isReplying,
  onReply,
  onCloseReply,
  isAppealing,
  onAppeal,
  onCloseAppeal,
  onReport,
  onOpenClient,
}: ReviewRowProps) => {
  const {
    client_name: name,
    is_former: isFormer,
    rating,
    created_at: createdAt,
    service_name: service,
    body,
    is_text_removed: isTextRemoved,
    reply,
    is_reply_edited: isReplyEdited,
    is_reported: isReported,
    status,
    appeal_state: appealState,
    id,
  } = review;

  const statusTag = getStatusTag(review);
  const isUp = status === "published" || status === "text_removed";
  const [isExpanded, setExpanded] = useState(false);
  const [isCut, setCut] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  // a deleted account keeps no link to the stylist's card
  const clientId = isFormer ? null : client?.id;

  // "Read more" only when the 4-line clamp actually hides text, re-checked as the width changes
  useLayoutEffect(() => {
    const element = bodyRef.current;

    if (!element || isExpanded) return;

    const measure = () =>
      setCut(element.scrollHeight > element.clientHeight + 1);

    measure();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(measure);

    observer.observe(element);

    return () => observer.disconnect();
  }, [body, isExpanded]);

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
        {!!statusTag && <span className={styles.checking}>{statusTag}</span>}
      </div>
      <div className={styles.content}>
        <div className={styles.meta}>
          <StarRating rating={rating} />
          <span>{formatReviewDate(createdAt)}</span>
          <span aria-hidden="true">·</span>
          <span>{service}</span>
        </div>
        {!!body && (
          <p
            ref={bodyRef}
            id={`review-${id}`}
            className={joinClassNames(
              styles.body,
              !isExpanded && styles.clamped,
            )}
          >
            {body}
          </p>
        )}
        {isCut && !isExpanded && (
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
            The words were removed because they broke <ReviewRulesLink />. The
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
        {isReplying && (
          <ReplyForm reviewId={id} reply={reply ?? ""} onDone={onCloseReply} />
        )}
        {isAppealing && <AppealForm reviewId={id} onDone={onCloseAppeal} />}
        {!isReplying && !isAppealing && (
          <div className={styles.actions}>
            {isUp && (
              <button type="button" className={styles.action} onClick={onReply}>
                <MessageSquare size={15} strokeWidth={1.8} />
                {reply ? "Edit reply" : "Reply"}
              </button>
            )}
            {appealState === "open" && (
              <button
                type="button"
                className={styles.action}
                onClick={onAppeal}
              >
                <Scale size={15} strokeWidth={1.8} />
                Appeal
              </button>
            )}
            {appealState === "appealed" && (
              <span className={styles.reported}>Appeal sent</span>
            )}
            {isReported && <span className={styles.reported}>Reported</span>}
            {!isReported && status !== "removed" && (
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
