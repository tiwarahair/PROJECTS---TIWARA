import { Lock } from "lucide-react";
import { joinClassNames } from "../../../utils/class-names";
import { asStyle } from "../../../utils/as-style";
import type { StudioController } from "../core/use-studio";
import { BlockBadge } from "./block-badge";
import { getBlockTone } from "./timeline";
import type { BookingsView } from "./view";
import styles from "../../../styles/features/studio/bookings/day-view.module.css";
import shared from "../../../styles/features/studio/bookings/index.module.css";

interface DayViewProps {
  studio: StudioController;
  view: BookingsView;
}

export const DayView = ({ studio, view }: DayViewProps) => {
  const { slideFrom } = studio.state;

  const getSlideClass = () => {
    if (!slideFrom) return undefined;

    return slideFrom > 0 ? styles.slideFromNext : styles.slideFromPrev;
  };

  return (
    <div
      className={styles.dayView}
      onTouchStart={view.swipeStart}
      onTouchEnd={view.swipeEnd}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={joinClassNames(styles.timeline, getSlideClass())}
        onClick={view.onTimelineTap}
      >
        {view.dayOffBands.map(({ top, height }) => (
          <div
            key={top}
            className={joinClassNames(shared.band, shared.dayBand)}
            style={asStyle({ "--top": top, "--height": height })}
            aria-hidden="true"
          ></div>
        ))}
        {view.quarters.map((top) => (
          <div
            key={top}
            className={styles.quarter}
            style={asStyle({ "--top": top })}
            aria-hidden="true"
          ></div>
        ))}
        {view.hourLines.map(({ key, label, paddedHour, top, isWorking }) => (
          <div
            key={key}
            className={shared.hourLine}
            id={`tl-h-${paddedHour}`}
            style={asStyle({ "--top": top })}
          >
            <span
              className={joinClassNames(
                shared.hourLabel,
                !isWorking && shared.hourLabelOff,
              )}
            >
              {label}
            </span>
            <span className={styles.dayRule}></span>
          </div>
        ))}
        {view.dayBlocked.map(({ key, top, height, hex, label, open }) => (
          <button
            key={key}
            className={styles.dayBlocked}
            style={asStyle({ "--top": top, "--height": height, "--hex": hex })}
            onClick={open}
          >
            <Lock
              className={styles.lockIcon}
              size={12}
              strokeWidth={2}
              color={hex}
            />
            <span className={styles.dayBlockedLabel}>{label}</span>
          </button>
        ))}
        {view.dayBlocks.map(({ booking, top, height }) => (
          <button
            key={booking.id}
            className={styles.dayBooking}
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
            <span className={styles.dayTop}>
              <span className={styles.dayName}>{booking.clientName}</span>
              <BlockBadge booking={booking} className={styles.dayBadge} />
            </span>
            <span className={styles.dayTime}>
              {booking.timeRange || booking.time}
            </span>
            <span className={styles.dayMeta}>
              {`${booking.service} · ${booking.priceLabel}`}
            </span>
          </button>
        ))}
        {view.stubs.map(
          ({ key, top, height, background, foreground, dash, label }) => (
            <div
              key={key}
              className={styles.stub}
              style={asStyle({
                "--top": top,
                "--height": height,
                "--stub-bg": background,
                "--stub-fg": foreground,
                "--stub-dash": dash,
              })}
              aria-hidden="true"
            >
              <span className={styles.stubLabel}>{label}</span>
            </div>
          ),
        )}
        {view.nowLine && (
          <div
            className={styles.nowLine}
            id="tl-now"
            style={asStyle({ "--top": view.nowLine.top })}
          >
            <span className={styles.nowLabel}>{view.nowLine.label}</span>
            <span className={styles.nowRule}></span>
          </div>
        )}
      </div>
    </div>
  );
};
