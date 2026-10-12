import type { CSSProperties, PointerEvent } from "react";
import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { BOOKING_LINK, GATE_REASON, NOTIFS, RANGE_DATA } from "./studio-data";
import { getDecoratedBookings } from "./studio-decorate";
import type { DecoratedBooking } from "./studio-decorate";
import { copyText, makeChart } from "./studio-format";
import {
  LinkCardBody,
  getSetupProgress,
  getSetupRows,
  isGated,
} from "./studio-shell";
import type { StudioController } from "./use-studio";
import styles from "./studio-home.module.css";

const RANGES = [
  { id: "today", label: "Today" },
  { id: "week", label: "7 days" },
  { id: "month", label: "30 days" },
] as const;

// desktop cards are stretched to the hero's height, so a quiet line under the number fills the room
const STAT_SUBTITLES: Record<string, string> = {
  Bookings: "vs last period",
  Revenue: "completed bookings",
  Occupancy: "of working hours",
  "New clients": "first visits",
};

// how many days ahead each range looks; anything else falls back to 30
const RANGE_DAYS: Record<string, number> = { today: 1, week: 7 };

const getZeroStat = (label: string) => (label === "Revenue" ? "£0" : "0");

const Chevron = ({
  stroke = "currentColor",
  strokeWidth = "1.7",
}: {
  stroke?: string;
  strokeWidth?: string;
}) => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m9 18 6-6-6-6"></path>
  </svg>
);

const getTileStyle = (booking: DecoratedBooking) =>
  // runtime: the service category's tile colours and the booking's status tone
  ({
    "--tile-line": booking.tileLine,
    "--tile-bg": booking.tileBackground,
    "--tile-bar": booking.tileBar,
    "--tile-text": booking.tileText,
    "--tile-meta": booking.tileMeta,
    "--st-bg": booking.statusBackground,
    "--st-color": booking.statusColor,
    "--st-border": booking.statusBorder,
  }) as CSSProperties;

const getDueLine = (booking: DecoratedBooking) => {
  const dayPrefix = booking.dayOffset < 0 ? `${booking.dayShort} ` : "";
  const endTime = booking.timeRange.split("–")[1] || booking.time;
  const dueNote = booking.due > 0 ? `£${booking.due} due` : "paid in full";

  return `${booking.service} · ended ${dayPrefix}${endTime} · ${dueNote}`;
};

const RangeSwitch = ({ studio }: { studio: StudioController }) => (
  <div className={styles.ranges}>
    {RANGES.map(({ id, label }) => (
      <button
        key={id}
        className={joinClassNames(
          styles.range,
          studio.state.range === id && styles.rangeOn,
        )}
        onClick={() => studio.setState({ range: id, chartIndex: null })}
      >
        {label}
      </button>
    ))}
  </div>
);

const SetupBanner = ({ studio }: { studio: StudioController }) => {
  const { steps, doneCount } = getSetupProgress(studio);

  // runtime: the share of setup steps done
  const barStyle = {
    "--setup-pct": `${((doneCount / 4) * 100).toFixed(0)}%`,
  } as CSSProperties;

  return (
    <section className={styles.setup}>
      <div className={styles.setupHead}>
        <div className={styles.setupTitle}>Set up your studio</div>
        <div className={styles.setupCount}>{`${doneCount} of 4 done`}</div>
      </div>
      <div className={styles.setupSub}>
        Four steps and clients can book you.
      </div>
      <div className={styles.setupTrack}>
        <div className={styles.setupBar} style={barStyle}></div>
      </div>
      <div className={styles.column}>
        {getSetupRows(studio).map(([key, label, subtitle, onSelect]) => {
          const isDone = !!steps[key];

          return (
            <button key={key} className={styles.setupRow} onClick={onSelect}>
              <span
                className={joinClassNames(
                  styles.setupTick,
                  isDone && styles.setupTickDone,
                )}
              >
                {isDone && (
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1a1714"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5"></path>
                  </svg>
                )}
              </span>
              <span
                className={joinClassNames(
                  styles.setupText,
                  isDone && styles.setupTextDone,
                )}
              >
                <span className={styles.setupLabel}>{label}</span>
                <span className={styles.setupRowSub}>{subtitle}</span>
              </span>
              <Chevron stroke="rgba(246,240,228,.55)" />
            </button>
          );
        })}
      </div>
    </section>
  );
};

/** Studio → Home. */
export const StudioHome = ({ studio }: { studio: StudioController }) => {
  const { state, setState, isWide, isDesktop, isNew, actions } = studio;
  const { isSetupOn, isComplete } = getSetupProgress(studio);

  const upcoming = getDecoratedBookings(state, isNew, (booking) =>
    actions.openSheet("booking", { sheetBookingId: booking.id }),
  );

  const rangeData = RANGE_DATA[state.range];
  const chart = makeChart(rangeData.chart);

  const tipPoint =
    state.chartIndex != null ? chart.points[state.chartIndex] : null;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const due = upcoming
    .filter(
      ({ status, awaiting, ended }) =>
        (status === "confirmed" || status === "arrived") && !awaiting && ended,
    )
    .sort(
      (first, second) =>
        first.dayOffset - second.dayOffset ||
        first.startMinutes - second.startMinutes,
    );

  const today = upcoming
    .filter(({ dayOffset }) => dayOffset === 0)
    .sort((first, second) => first.startMinutes - second.startMinutes);

  const next = today.find(
    ({ startMinutes, durationMinutes }) =>
      startMinutes + durationMinutes > nowMinutes,
  );

  const limit = RANGE_DAYS[state.range] ?? 30;

  const homeUpcoming = upcoming
    .filter(({ dayOffset }) => dayOffset >= 0 && dayOffset < limit)
    .slice(0, isDesktop ? 5 : 3);

  const stats = rangeData.stats;

  const statCards = (
    [
      ["Bookings", stats.bookings],
      ["Revenue", stats.revenue],
      ["Occupancy", stats.occupancy],
      ["New clients", stats.clients],
    ] as const
  ).map(([label, [value, delta]], index) => ({
    label,
    value: isNew ? getZeroStat(label) : value,
    subtitle: isDesktop && !isNew ? STAT_SUBTITLES[label] : "",
    delta: isNew ? "" : delta,
    delay: `${(index * 0.05).toFixed(2)}s`,
  }));

  const feed = NOTIFS.slice(0, 4);
  const isGate = isGated(studio);

  const goCalendarToday = () => {
    setState({ tab: "bookings", dayIndex: 0, bookingsLayout: "cal" });
    actions.scrollBody(0, false);
    actions.scrollCalendarToNow();
  };

  const copyLink = () => {
    if (isGate) {
      actions.showToast(GATE_REASON);

      return;
    }

    copyText(BOOKING_LINK);
    actions.showToast("Booking link copied");
  };

  const onChartMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 340;
    const count = rangeData.chart.length;

    const index = Math.max(
      0,
      Math.min(count - 1, Math.round(((x - 8) / (340 - 16)) * (count - 1))),
    );

    if (index !== state.chartIndex) setState({ chartIndex: index });
  };

  const getHeroNext = () => {
    if (next)
      return `Next: ${next.clientName} at ${next.time} · ${next.service}`;

    return today.length
      ? "All done for today"
      : "Share your link to fill the day";
  };

  const getEmptyTitle = () => {
    if (isNew) return "No appointments yet";

    return state.range === "today"
      ? "Nothing booked today"
      : "Nothing booked in this range";
  };

  return (
    <div
      className={joinClassNames(
        styles.home,
        isDesktop ? styles.homeDesk : isWide && styles.homeWide,
      )}
      data-screen-label="Home"
    >
      {isGate && (
        <section
          className={styles.gate}
          role="status"
          data-screen-label="Go-live banner"
        >
          <span className={styles.gateIcon}>
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4" y="11" width="16" height="10" rx="2"></rect>
              <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
            </svg>
          </span>
          <div className={styles.gateText}>
            <span className={styles.bold}>Finish setup to go live</span> — your
            booking link and payouts are off until you turn on two-step
            verification, add your tax details and connect Stripe.
          </div>
          <button
            className={styles.gateButton}
            onClick={() => actions.openTwoFactor("secure")}
          >
            Continue setup
          </button>
        </section>
      )}
      {!isWide && isSetupOn && !isComplete && <SetupBanner studio={studio} />}
      {!isWide && state.linkCard && (
        <section
          className={styles.linkReady}
          role="status"
          data-screen-label="Booking link ready"
        >
          <LinkCardBody studio={studio} />
        </section>
      )}
      {isSetupOn &&
        isComplete &&
        !state.linkCard &&
        !state.setupExit &&
        state.nudge && (
          <section className={styles.nudge} data-screen-label="Policy nudge">
            <div className={styles.nudgeHead}>
              <div className={styles.grow}>
                <div className={styles.nudgeTitle}>
                  Make your policy your own
                </div>
                <div className={styles.nudgeBody}>
                  You can take bookings now. Until you set a booking policy,
                  clients book without a deposit or card, and can cancel at any
                  time.
                </div>
              </div>
              <button
                className={styles.nudgeClose}
                onClick={() => setState({ nudge: false })}
                aria-label="Dismiss"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M18 6 6 18M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div className={styles.nudgeActions}>
              <button
                className={styles.nudgeButton}
                onClick={() => actions.openSubpage("policy")}
              >
                Payment policy
              </button>
            </div>
          </section>
        )}

      <section
        className={joinClassNames(styles.hero, styles.main)}
        data-screen-label="Today hero"
      >
        <img
          className={styles.heroImage}
          src={getAssetUrl("site/hero2.jpg")}
          alt=""
        />
        <div className={styles.heroShade}></div>
        <div className={styles.heroBody}>
          <div className={styles.minWidth}>
            <div className={styles.heroEyebrow}>Today</div>
            <div className={styles.heroTitle}>
              {today.length === 0
                ? "Nothing booked"
                : today.length +
                  (today.length === 1 ? " appointment" : " appointments")}
            </div>
            <div className={styles.heroNext}>{getHeroNext()}</div>
          </div>
          <button className={styles.heroButton} onClick={goCalendarToday}>
            Open calendar
            <Chevron strokeWidth="2" />
          </button>
        </div>
      </section>

      <section className={styles.side}>
        {!isDesktop && (
          <div className={styles.sectionHead}>
            <h2 className={styles.h2}>Overview</h2>
            <RangeSwitch studio={studio} />
          </div>
        )}
        <div className={styles.stats}>
          {statCards.map(({ label, value, subtitle, delta, delay }) => (
            // runtime: staggered entry
            <div
              key={label}
              className={styles.stat}
              style={{ "--delay": delay } as CSSProperties}
            >
              <div className={styles.statHead}>
                <div className={styles.muted}>{label}</div>
                {delta && <div className={styles.delta}>{delta}</div>}
              </div>
              <div>
                <div className={styles.statValue}>{value}</div>
                {subtitle && <div className={styles.statSub}>{subtitle}</div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.chartSection}>
        <div className={styles.panel}>
          <div className={styles.chartHead}>
            <div>
              <div className={styles.chartTitle}>Revenue</div>
              <div className={styles.muted}>{rangeData.caption}</div>
            </div>
            {isDesktop && <RangeSwitch studio={studio} />}
          </div>
          {isNew && (
            <div className={styles.chartEmpty}>
              <div className={styles.emptyTitle}>Nothing to chart yet</div>
              <div className={styles.emptyBody}>
                Your revenue will appear here after your first completed
                appointment.
              </div>
            </div>
          )}
          {!isNew && (
            <>
              <div
                className={styles.chart}
                onPointerMove={onChartMove}
                onPointerLeave={() => setState({ chartIndex: null })}
                onPointerDown={onChartMove}
              >
                <svg className={styles.chartSvg} viewBox="0 0 340 120">
                  <defs>
                    <linearGradient id="revg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(143,17,18,.22)"></stop>
                      <stop offset="100%" stopColor="rgba(143,17,18,0)"></stop>
                    </linearGradient>
                  </defs>
                  <line
                    x1="8"
                    y1="112"
                    x2="332"
                    y2="112"
                    stroke="var(--border-subtle)"
                    strokeWidth="1"
                  ></line>
                  <path d={chart.area} fill="url(#revg)"></path>
                  <path
                    d={chart.line}
                    fill="none"
                    stroke="var(--accent-700)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></path>
                  {tipPoint && (
                    <>
                      <line
                        x1={tipPoint.x.toFixed(1)}
                        y1="14"
                        x2={tipPoint.x.toFixed(1)}
                        y2="112"
                        stroke="var(--accent-line)"
                        strokeWidth="1"
                      ></line>
                      <circle
                        cx={tipPoint.x.toFixed(1)}
                        cy={tipPoint.y.toFixed(1)}
                        r="4.5"
                        fill="var(--accent-700)"
                        stroke="#fff"
                        strokeWidth="2"
                      ></circle>
                    </>
                  )}
                </svg>
                {tipPoint && state.chartIndex != null && (
                  <div
                    className={styles.chartTip}
                    // runtime: over the hovered point
                    style={
                      {
                        "--tip-left": `${((tipPoint.x / 340) * 100).toFixed(1)}%`,
                      } as CSSProperties
                    }
                  >
                    {`${rangeData.tips[state.chartIndex]} · £${tipPoint.value}`}
                  </div>
                )}
              </div>
              <div className={styles.chartLabels}>
                {rangeData.labels.map((label, index) => (
                  <span key={index} className={styles.chartLabel}>
                    {label}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section className={styles.sidePanel} data-screen-label="Today">
        <div className={styles.todayPanel}>
          <div className={styles.panelHead}>
            <h2 className={styles.h2}>Today</h2>
            <button className={styles.textLink} onClick={goCalendarToday}>
              Calendar
            </button>
          </div>
          {today.length === 0 && (
            <div className={styles.dashed}>
              <div className={styles.emptyTitle}>Nothing booked today</div>
              <div className={styles.emptySub}>
                Open a slot or share your link to fill it.
              </div>
            </div>
          )}
          <div className={styles.stack8}>
            {today.map((booking) => (
              <button
                key={booking.id}
                className={styles.todayTile}
                style={getTileStyle(booking)}
                onClick={booking.open}
              >
                <img
                  className={styles.tileAvatar}
                  src={booking.imgSrc}
                  alt=""
                />
                <span className={styles.grow}>
                  <span className={styles.tileName}>{booking.clientName}</span>
                  <span className={styles.tileMeta}>
                    {`${booking.service} · ${booking.timeRange}`}
                  </span>
                </span>
                <span className={styles.status}>{booking.statusLabel}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {due.length > 0 && (
        <section
          className={styles.sidePanel}
          data-screen-label="Due for checkout"
        >
          <div className={styles.duePanel}>
            <div className={styles.dueHead}>
              <h2 className={styles.h2}>Due for checkout</h2>
              <span className={styles.dueCount}>
                {due.length + (due.length === 1 ? " booking" : " bookings")}
              </span>
            </div>
            {due.map((booking, index) => (
              <div
                key={booking.id}
                className={joinClassNames(
                  styles.dueRow,
                  index === 0 && styles.dueRowFirst,
                )}
              >
                <button
                  className={styles.dueOpen}
                  onClick={() =>
                    actions.openSheet("booking", { sheetBookingId: booking.id })
                  }
                >
                  <img
                    className={styles.avatar38}
                    src={booking.imgSrc}
                    alt=""
                  />
                  <span className={styles.grow}>
                    <span className={styles.dueName}>{booking.clientName}</span>
                    <span className={styles.dueMetaRow}>
                      {booking.unpaidFlag && (
                        <span className={styles.unpaid}>
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"></path>
                          </svg>
                          Unpaid
                        </span>
                      )}
                      <span className={styles.dueCount}>
                        {getDueLine(booking)}
                      </span>
                    </span>
                  </span>
                </button>
                <button
                  className={styles.checkout}
                  onClick={() =>
                    actions.openSheet("booking", {
                      sheetBookingId: booking.id,
                      bookingStep: "checkout",
                    })
                  }
                >
                  Checkout
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section
        className={joinClassNames(
          styles.upcoming,
          due.length > 0 && styles.upcomingSpan,
        )}
      >
        <div className={styles.panelHead}>
          <h2 className={styles.h2}>
            {state.range === "today"
              ? "Today's appointments"
              : "Upcoming appointments"}
          </h2>
          <button
            className={styles.textLink}
            onClick={() => actions.setCalendar({ tab: "bookings" })}
          >
            View all
          </button>
        </div>
        {upcoming.length === 0 && (
          <div className={styles.emptyCard}>
            <div className={styles.emptyCardTitle}>{getEmptyTitle()}</div>
            <div className={styles.emptyCardBody}>
              {isNew
                ? "Share your booking link to get your first one."
                : "Open a slot or share your link to fill it."}
            </div>
            <button className={styles.copyButton} onClick={copyLink}>
              Copy booking link
            </button>
          </div>
        )}
        <div className={styles.stack10}>
          {homeUpcoming.map((booking) => (
            <button
              key={booking.id}
              className={styles.upRow}
              // runtime: staggered entry
              style={{ "--delay": booking.delay } as CSSProperties}
              onClick={booking.open}
            >
              <div className={styles.dateChip}>
                <div className={styles.dateDay}>{booking.dayShort}</div>
                <div className={styles.dateTime}>{booking.time}</div>
              </div>
              <img className={styles.avatar38} src={booking.imgSrc} alt="" />
              <div className={styles.grow}>
                <div className={styles.upName}>{booking.clientName}</div>
                <div className={styles.upMeta}>
                  {`${booking.service} · ${booking.timeRange}`}
                </div>
              </div>
              <div className={styles.upPrice}>{booking.priceLabel}</div>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.sidePanel} data-screen-label="Activity">
        <div className={styles.panelHead}>
          <h2 className={styles.h2}>Recent activity</h2>
          <button
            className={styles.textLink}
            onClick={() => actions.openSheet("notif")}
          >
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
              onClick={() => actions.openSheet("notif")}
            >
              <span className={styles.feedInner}>
                <span className={styles.feedDot} aria-hidden="true"></span>
                <span className={styles.grow}>
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
    </div>
  );
};
