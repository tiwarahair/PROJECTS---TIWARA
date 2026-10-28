import { joinClassNames } from "../../../utils/class-names";
import { asStyle } from "../../../utils/as-style";
import { BlockBadge } from "./block-badge";
import { getBlockTone } from "./timeline";
import type { BookingsView } from "./view";
import styles from "../../../styles/features/studio/bookings/week-view.module.css";
import shared from "../../../styles/features/studio/bookings/index.module.css";

interface WeekViewProps {
  view: BookingsView;
}

export const WeekView = ({ view }: WeekViewProps) => (
  <div className={shared.weekView} data-screen-label="Week view">
    <div className={shared.weekInner}>
      <div className={styles.weekHead}>
        <div></div>
        {view.weekCols.map(
          ({ key, weekday, dayNumber, isToday, isSelected, pickDay }) => (
            <button key={key} className={styles.weekDay} onClick={pickDay}>
              <span className={styles.weekDow}>{weekday}</span>
              <span
                className={joinClassNames(
                  styles.weekNum,
                  isToday
                    ? styles.weekNumToday
                    : isSelected && styles.weekNumOn,
                )}
              >
                {dayNumber}
              </span>
            </button>
          ),
        )}
      </div>
      <div className={shared.weekScroll} data-wk-scroll="1">
        <div className={styles.weekGrid}>
          {view.weekHours.map(({ key, label, top }) => (
            <div
              key={key}
              className={shared.hourLine}
              style={asStyle({ "--top": top })}
            >
              <span className={shared.hourLabel}>{label}</span>
              <span className={styles.weekRule}></span>
            </div>
          ))}
          <div className={styles.weekCols}>
            {view.weekCols.map(
              ({ key, isSelected, offBands, blocked, blocks, nowTop, tap }) => (
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
                <div
                  key={key}
                  className={joinClassNames(
                    styles.weekCol,
                    isSelected && styles.weekColOn,
                  )}
                  onClick={tap}
                >
                  {offBands.map(({ top, height }) => (
                    <div
                      key={top}
                      className={shared.band}
                      style={asStyle({ "--top": top, "--height": height })}
                      aria-hidden="true"
                    ></div>
                  ))}
                  {blocked.map(
                    ({ key: blockKey, top, height, hex, label, open }) => (
                      <button
                        key={blockKey}
                        className={styles.weekBlocked}
                        style={asStyle({
                          "--top": top,
                          "--height": height,
                          "--hex": hex,
                        })}
                        onClick={open}
                      >
                        <span className={styles.weekBlockedLabel}>{label}</span>
                      </button>
                    ),
                  )}
                  {blocks.map(({ booking, top, height }) => (
                    <button
                      key={booking.id}
                      className={styles.weekBooking}
                      style={asStyle({
                        "--top": top,
                        "--height": height,
                        ...getBlockTone(booking),
                      })}
                      onClick={(event) => {
                        event.stopPropagation();
                        booking.open();
                      }}
                    >
                      <span className={styles.weekTop}>
                        <span className={styles.weekName}>
                          {booking.clientName}
                        </span>
                        <BlockBadge
                          booking={booking}
                          className={styles.weekBadge}
                        />
                      </span>
                      <span className={styles.weekMeta}>
                        {booking.timeRange || booking.time}
                      </span>
                      <span className={styles.weekMeta}>{booking.service}</span>
                    </button>
                  ))}
                  {nowTop && (
                    <div
                      className={styles.weekNow}
                      style={asStyle({ "--top": nowTop })}
                      aria-hidden="true"
                    >
                      <span className={styles.weekNowDot}></span>
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);
