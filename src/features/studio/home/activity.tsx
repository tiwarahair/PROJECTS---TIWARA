import { joinClassNames } from "../../../utils/class-names";
import type { StudioController } from "../core/use-studio";
import type { HomeView } from "./view";
import styles from "../../../styles/features/studio/home/activity.module.css";
import shared from "../../../styles/features/studio/home/index.module.css";

interface ActivityPanelProps {
  studio: StudioController;
  view: HomeView;
}

export const ActivityPanel = ({ studio, view }: ActivityPanelProps) => {
  const { feed } = view;
  const openNotifications = () => studio.actions.openSheet("notif");

  return (
    <section className={shared.sidePanel} data-screen-label="Activity">
      <div className={shared.panelHead}>
        <h2 className={shared.h2}>Recent activity</h2>
        <button className={shared.textLink} onClick={openNotifications}>
          View all
        </button>
      </div>
      <div className={styles.feed}>
        {feed.map(({ title, body, time }, index) => (
          <button
            key={title}
            className={joinClassNames(
              styles.feedRow,
              index === feed.length - 1 && styles.feedRowLast,
            )}
            onClick={openNotifications}
          >
            <span className={styles.feedInner}>
              <span className={styles.feedDot} aria-hidden="true"></span>
              <span className={shared.grow}>
                <span className={styles.feedTop}>
                  <span className={styles.feedTitle}>{title}</span>
                  <span className={styles.feedTime}>{time}</span>
                </span>
                <span className={styles.feedBody}>{body}</span>
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};
