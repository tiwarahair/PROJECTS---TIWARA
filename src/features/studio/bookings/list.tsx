import { X } from "lucide-react";
import { joinClassNames } from "../../../utils/class-names";
import { PastRow } from "./past-row";
import { UpcomingRow } from "./upcoming-row";
import type { BookingsView } from "./view";
import styles from "../../../styles/features/studio/bookings/list.module.css";

interface BookingsListProps {
  view: BookingsView;
}

export const BookingsList = ({ view }: BookingsListProps) => (
  <div className={styles.list}>
    {view.isFilterActive && (
      <div className={styles.chips}>
        {view.filterChips.map(({ label, clear }) => (
          <button key={label} className={styles.chip} onClick={clear}>
            {label}
            <X size={11} strokeWidth={2.4} />
          </button>
        ))}
        <button className={styles.clearAll} onClick={view.clearFilter}>
          Clear all
        </button>
      </div>
    )}
    <div className={styles.summary}>
      <span className={styles.muted}>{view.listSummary}</span>
      <span className={styles.total}>{view.listTotal}</span>
    </div>
    {view.isListEmpty && (
      <div className={styles.listEmpty}>
        <div className={styles.listEmptyTitle}>{view.listEmptyTitle}</div>
        <div className={styles.listEmptyBody}>{view.listEmptyBody}</div>
        {view.isFilterActive && (
          <button className={styles.clearFilters} onClick={view.clearFilter}>
            Clear filters
          </button>
        )}
      </div>
    )}
    {view.isUpcoming &&
      view.upcomingGroups.map(
        ({ key, isLast, label, isToday, meta, items }) => (
          <div
            key={key}
            className={joinClassNames(styles.group, isLast && styles.groupLast)}
          >
            <div className={styles.groupHead}>
              <span
                className={joinClassNames(
                  styles.groupLabel,
                  isToday && styles.groupLabelToday,
                )}
              >
                {label}
              </span>
              <span className={styles.groupMeta}>{meta}</span>
            </div>
            <div className={styles.stack10}>
              {items.map((booking) => (
                <UpcomingRow key={booking.id} booking={booking} />
              ))}
            </div>
          </div>
        ),
      )}
    {view.isPast &&
      view.pastGroups.map(({ month, items }) => (
        <div key={month} className={styles.month}>
          <div className={styles.monthLabel}>{month}</div>
          <div className={styles.stack10}>
            {items.map((item) => (
              <PastRow key={item.key} item={item} />
            ))}
          </div>
        </div>
      ))}
    {view.hasOlderPast && (
      <button className={styles.showOlder} onClick={view.loadOlderPast}>
        {view.olderPastLabel}
      </button>
    )}
  </div>
);
