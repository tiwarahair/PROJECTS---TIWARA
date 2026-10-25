import type { CSSProperties } from "react";
import { ChevronRight } from "lucide-react";
import { joinClassNames } from "../../../utils/class-names";
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
  const { state, setState, isWide, actions } = studio;

  const deepLink = (run: () => void) => () => {
    actions.closeSheet();
    window.setTimeout(run, 230);
  };

  const handlers = [
    deepLink(() =>
      setState({
        tab: "bookings",
        bookingsLayout: "list",
        listScope: "past",
        pastFilter: "off",
      }),
    ),
    deepLink(() => {
      setState({ tab: "bookings", dayIndex: 3, bookingsLayout: "cal" });
      actions.openSheet("booking", { sheetBookingId: 4 });
    }),
    deepLink(() => {
      if (isWide) {
        setState({ tab: "clients" });

        actions.openSheet("cliView", {
          selectedClientId: "kemi",
          clientAppointmentsTab: "past",
        });
      } else
        setState({
          tab: "clients",
          selectedClientId: "kemi",
          clientAppointmentsTab: "past",
        });
    }),
    deepLink(() => setState({ tab: "earnings" })),
    deepLink(() => {
      setState({ tab: "bookings", dayIndex: 0, bookingsLayout: "cal" });
      actions.openSheet("booking", { sheetBookingId: 1 });
    }),
  ];

  const getHandler = (
    { bookingId, opensEarnings, opensReviews }: StudioNotification,
    index: number,
  ) => {
    if (opensReviews) return deepLink(() => setState({ tab: "reviews" }));

    if (bookingId)
      return deepLink(() => void openBookingById(studio, bookingId));

    if (opensEarnings) return deepLink(() => setState({ tab: "earnings" }));

    return handlers[index];
  };

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
          onClick={getHandler(item, index)}
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
