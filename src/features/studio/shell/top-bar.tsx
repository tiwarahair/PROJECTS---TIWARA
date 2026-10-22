import { Bell, Plus } from "lucide-react";
import { Avatar } from "../../../components/ds/avatar";
import { joinClassNames } from "../../../utils/class-names";
import type { StudioController } from "../core/use-studio";
import shared from "../../../styles/features/studio/shell/index.module.css";
import styles from "../../../styles/features/studio/shell/top-bar.module.css";
import { SHORT_MONTHS, SHORT_WEEKDAYS } from "../../../utils/dates";

const getDayPart = (hour: number) => {
  if (hour < 12) return "Morning";

  return hour < 18 ? "Afternoon" : "Evening";
};

export const StudioTopBar = ({ studio }: { studio: StudioController }) => {
  const { state, isWide, isDesktop, setState, actions } = studio;
  const now = new Date();
  const greeting = `${getDayPart(now.getHours())}, ${state.owner.first}`;

  const isHidden =
    !isWide &&
    (state.tab === "settings" ||
      state.tab === "clients" ||
      state.tab === "reviews");

  return (
    <div
      className={joinClassNames(
        styles.topBar,
        isDesktop ? styles.topBarDesk : isWide && styles.topBarWide,
        isHidden && styles.topBarHidden,
      )}
      data-screen-label="Top bar"
    >
      {!isWide && (
        <button
          className={styles.avatarButton}
          onClick={() => setState({ tab: "settings", page: null })}
          aria-label="Profile and settings"
        >
          <Avatar
            className={styles.avatar42}
            src={state.avatarUrl ?? undefined}
            name={state.owner.name}
            size={42}
          />
        </button>
      )}
      <div className={shared.grow}>
        <div className={styles.title}>{greeting}</div>
        <div className={styles.dateLine}>
          {`${SHORT_WEEKDAYS[now.getDay()]} ${now.getDate()} ${SHORT_MONTHS[now.getMonth()]}`}
        </div>
      </div>
      <button
        className={styles.bell}
        onClick={() => actions.openSheet("notif")}
        aria-label="Notifications"
      >
        <Bell size={19} strokeWidth={1.7} />
        {!state.notifAllRead && <span className={styles.unreadDot}></span>}
      </button>
      {isWide && !(state.tab === "clients" && state.selectedClientId) && (
        <button
          className={styles.newBooking}
          onClick={() => actions.openSheet("add")}
        >
          <Plus size={14} strokeWidth={2.2} /> New booking
        </button>
      )}
    </div>
  );
};
