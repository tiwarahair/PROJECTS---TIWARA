import { Bell, Plus } from "lucide-react";
import { Avatar } from "../../../components/ds/avatar";
import { AppShellTopBar } from "../../../components/app-shell";
import type { StudioController } from "../core/use-studio";
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
    <AppShellTopBar
      title={greeting}
      note={`${SHORT_WEEKDAYS[now.getDay()]} ${now.getDate()} ${SHORT_MONTHS[now.getMonth()]}`}
      isWide={isWide}
      isDesktop={isDesktop}
      isHidden={isHidden}
      leading={
        !isWide && (
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
        )
      }
    >
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
    </AppShellTopBar>
  );
};
