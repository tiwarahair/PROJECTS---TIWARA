import type { CSSProperties } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { ChevronRight } from "lucide-react";
import { InlineRetry } from "../../../components/inline-retry";
import { useGetStudioActivityQuery } from "../../../stores/api-slice";
import { joinClassNames } from "../../../utils/class-names";
import { markActivityRead } from "../../../lib/studio-api/home";
import { openBookingById } from "../bookings/open-by-id";
import { getNotificationTime } from "../home/activity-records";
import type { StudioNotification } from "../core/types";
import type { StudioController } from "../core/use-studio";
import styles from "../../../styles/features/studio/shell/notifications-sheet.module.css";

export const NotificationsSheet = ({
  studio,
}: {
  studio: StudioController;
}) => {
  const { state, setState, actions } = studio;

  const { isError, refetch } = useGetStudioActivityQuery(
    state.account.stylistId || skipToken,
  );

  const deepLink = (run: () => void) => () => {
    actions.closeSheet();
    window.setTimeout(run, 230);
  };

  const getNavigation = ({
    bookingId,
    opensEarnings,
    opensReviews,
  }: StudioNotification) => {
    if (opensReviews) return deepLink(() => setState({ tab: "reviews" }));

    if (bookingId)
      return deepLink(() => void openBookingById(studio, bookingId));

    if (opensEarnings) return deepLink(() => setState({ tab: "earnings" }));

    return undefined;
  };

  const markRead = ({ id, unread }: StudioNotification) => {
    const { stylistId } = state.account;

    if (!id || !unread || state.notifAllRead || !stylistId) return;

    const notifications = state.notifications.map((item) =>
      item.id === id ? { ...item, unread: false } : item,
    );

    setState({
      notifications,
      notifAllRead: !notifications.some(({ unread: isUnread }) => isUnread),
    });

    studio.context.sync.save(() => markActivityRead(stylistId, id), {
      notifications: state.notifications,
      notifAllRead: state.notifAllRead,
    });
  };

  const open = (item: StudioNotification) => () => {
    markRead(item);
    getNavigation(item)?.();
  };

  if (!state.notifications.length && isError)
    return (
      <div className={styles.empty}>
        <InlineRetry
          className={styles.retry}
          text="Couldn’t load notifications ·"
          onRetry={() => void refetch()}
        />
      </div>
    );

  if (!state.notifications.length)
    return <div className={styles.empty}>Nothing new yet</div>;

  return (
    <div className={styles.stack8}>
      {state.notifications.map((item, index) => (
        <button
          key={item.id ?? item.title}
          className={styles.notif}
          // runtime: staggered entry
          style={
            { "--delay": `${(index * 0.05).toFixed(2)}s` } as CSSProperties
          }
          onClick={open(item)}
        >
          <span
            className={joinClassNames(
              styles.notifDot,
              item.unread && !state.notifAllRead && styles.notifDotUnread,
            )}
          ></span>
          <span className={styles.grow}>
            <span className={styles.notifTop}>
              <span className={styles.notifTitle}>{item.title}</span>
              <span className={styles.notifTime}>
                {getNotificationTime(item)}
              </span>
            </span>
            <span className={styles.notifBody}>{item.body}</span>
          </span>
          <ChevronRight
            className={styles.chevron}
            size={15}
            strokeWidth={1.7}
            color="var(--text-secondary)"
          />
        </button>
      ))}
    </div>
  );
};
