import type { CSSProperties } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  List,
  ListFilter,
  Lock,
  Search,
  X,
} from "lucide-react";
import { joinClassNames } from "../../../utils/class-names";
import { getBlockTone, getBookingsView } from "./view";
import type { BookingsView } from "./view";
import { GATE_REASON } from "../core/data";
import type { DecoratedBooking } from "./decorate";
import { copyText, dateAt } from "../core/format";
import { isGated } from "../shell";
import type { StudioController } from "../core/use-studio";
import styles from "../../../styles/features/studio/bookings/index.module.css";
import { MONDAY_FIRST_WEEKDAYS } from "../../../utils/dates";
import { getBookingLink } from "../core/model";

const VIEW_SEGMENTS = [
  {
    id: "cal",
    label: "Calendar",
    icon: Calendar,
  },
  {
    id: "list",
    label: "List",
    icon: List,
  },
];

const asStyle = (values: Record<string, string | null | undefined>) =>
  values as CSSProperties;

const DatePicker = ({
  studio,
  view,
}: {
  studio: StudioController;
  view: BookingsView;
}) => {
  const { state, setState } = studio;

  const toggle = () => {
    const date = dateAt(state.dayIndex);

    setState({
      datePickerOpen: !state.datePickerOpen,
      bookingCalendarMonth: state.datePickerOpen
        ? state.bookingCalendarMonth
        : date.getMonth(),
      bookingCalendarYear: state.datePickerOpen
        ? state.bookingCalendarYear
        : date.getFullYear(),
    });
  };

  const now = new Date();

  const goPrev = () => {
    const month = state.bookingCalendarMonth ?? 0;
    const year = state.bookingCalendarYear ?? 0;

    if (
      year < now.getFullYear() ||
      (year === now.getFullYear() && month <= now.getMonth())
    )
      return;

    setState(
      month === 0
        ? { bookingCalendarMonth: 11, bookingCalendarYear: year - 1 }
        : { bookingCalendarMonth: month - 1, bookingCalendarYear: year },
    );
  };

  const goNext = () => {
    const month = state.bookingCalendarMonth ?? 0;
    const year = state.bookingCalendarYear ?? 0;

    setState(
      month === 11
        ? { bookingCalendarMonth: 0, bookingCalendarYear: year + 1 }
        : { bookingCalendarMonth: month + 1, bookingCalendarYear: year },
    );
  };

  return (
    <div className={styles.dateNav}>
      <button
        className={styles.weekArrow}
        onClick={() => studio.actions.setDay({ dayIndex: state.dayIndex - 7 })}
        disabled={false}
        aria-label="Previous week"
      >
        <ChevronLeft size={15} strokeWidth={2} />
      </button>
      <button className={styles.dateButton} onClick={toggle}>
        <span className={styles.dateLabel}>{view.calendarDateLabel}</span>
        <ChevronDown
          className={joinClassNames(
            styles.chevron,
            state.datePickerOpen && styles.chevronOpen,
          )}
          size={13}
          strokeWidth={2.2}
        />
      </button>
      <button
        className={joinClassNames(styles.weekArrow, styles.weekArrowNext)}
        onClick={() => studio.actions.setDay({ dayIndex: state.dayIndex + 7 })}
        aria-label="Next week"
      >
        <ChevronRight size={15} strokeWidth={2} />
      </button>
      {state.datePickerOpen && (
        <>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div className={styles.pickerScrim} onClick={toggle}></div>
          <div className={styles.picker}>
            <div className={styles.pickerHead}>
              <button
                className={joinClassNames(
                  styles.monthArrow,
                  view.isPrevOff && styles.monthArrowOff,
                )}
                onClick={goPrev}
                disabled={view.isPrevOff}
                aria-label="Previous month"
              >
                <ChevronLeft size={15} strokeWidth={2} />
              </button>
              <div className={styles.h3}>{view.pickerTitle}</div>
              <button
                className={styles.monthArrow}
                onClick={goNext}
                aria-label="Next month"
              >
                <ChevronRight size={15} strokeWidth={2} />
              </button>
            </div>
            <div className={styles.dows}>
              {MONDAY_FIRST_WEEKDAYS.map((weekday) => (
                <div key={weekday} className={styles.dow}>
                  {weekday}
                </div>
              ))}
            </div>
            <div className={styles.days}>
              {view.pickerDays.map(
                ({
                  key,
                  dayNumber,
                  disabled,
                  background,
                  color,
                  weight,
                  dot,
                  pick,
                }) => (
                  <button
                    key={key}
                    className={styles.calDay}
                    // runtime: the day's selected / past state and booking dot
                    style={asStyle({
                      "--day-bg": background,
                      "--day-color": color,
                      "--day-weight": weight,
                    })}
                    onClick={pick}
                    disabled={disabled}
                  >
                    {dayNumber}
                    <span
                      className={styles.dot}
                      style={asStyle({ "--dot": dot })}
                    ></span>
                  </button>
                ),
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const BookingsHeader = ({
  studio,
  view,
}: {
  studio: StudioController;
  view: BookingsView;
}) => {
  const { state, setState, isWide, actions } = studio;

  const isOn = (id: string) =>
    state.bookingsLayout === id || (id === "cal" && !view.isList);

  return (
    <div
      className={joinClassNames(
        styles.header,
        !view.isList && state.calendarMode === "week" && styles.headerFlat,
      )}
    >
      <div className={styles.controls}>
        <div className={styles.controlRow}>
          <div className={styles.segments}>
            {VIEW_SEGMENTS.map(({ id, label, icon: SegmentIcon }) => (
              <button
                key={id}
                className={joinClassNames(
                  styles.segment,
                  styles.viewSegment,
                  isOn(id) && styles.segmentOn,
                )}
                onClick={() =>
                  actions.setCalendar({
                    bookingsLayout: id,
                    datePickerOpen: false,
                  })
                }
                title={label}
                aria-label={label}
              >
                <SegmentIcon
                  className={styles.noShrink}
                  size={16}
                  strokeWidth={1.8}
                />
                {isWide && <span>{label}</span>}
              </button>
            ))}
          </div>
          {view.isCalendar && (
            <>
              <div className={styles.segments}>
                {[
                  { id: "day", label: "Day" },
                  { id: "week", label: "Week" },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    className={joinClassNames(
                      styles.segment,
                      styles.modeSegment,
                      (state.calendarMode || "day") === id && styles.segmentOn,
                    )}
                    onClick={() => actions.setCalendar({ calendarMode: id })}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                className={joinClassNames(
                  styles.today,
                  state.dayIndex === 0 && styles.todayOff,
                )}
                onClick={() => actions.setCalendar({ dayIndex: 0 })}
                disabled={state.dayIndex === 0}
              >
                Today
              </button>
            </>
          )}
          {view.isList && (
            <div className={styles.segments}>
              {[
                { id: "upcoming", label: "Upcoming" },
                { id: "past", label: "Past" },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  className={joinClassNames(
                    styles.segment,
                    styles.scopeSegment,
                    (state.listScope || "upcoming") === id && styles.segmentOn,
                  )}
                  onClick={() => setState({ listScope: id })}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {view.isCalendar && (
        <>
          <DatePicker studio={studio} view={view} />
          <div
            className={styles.weekStrip}
            onTouchStart={view.swipeStart}
            onTouchEnd={view.swipeEnd}
          >
            {view.weekStrip.map(
              ({
                key,
                weekday,
                dayNumber,
                isSelected,
                isToday,
                isPast,
                dot,
                pick,
              }) => (
                <button
                  key={key}
                  className={styles.stripDay}
                  onClick={pick}
                  disabled={false}
                >
                  <span
                    className={joinClassNames(
                      styles.stripDow,
                      isPast
                        ? styles.stripDowPast
                        : isToday && styles.stripDowToday,
                    )}
                  >
                    {weekday}
                  </span>
                  <span
                    className={joinClassNames(
                      styles.stripNum,
                      isPast
                        ? styles.stripNumPast
                        : isToday && styles.stripNumToday,
                      isSelected && styles.stripNumOn,
                    )}
                  >
                    {dayNumber}
                  </span>
                  <span
                    className={styles.dot}
                    style={asStyle({ "--dot": dot })}
                  ></span>
                </button>
              ),
            )}
          </div>
        </>
      )}
      {view.isList && (
        <div className={styles.search}>
          <div className={styles.searchField}>
            <Search
              className={styles.searchIcon}
              size={15}
              strokeWidth={2}
              color="var(--text-secondary)"
            />
            <input
              className={styles.searchInput}
              value={state.bookingsQuery || ""}
              onChange={(event) =>
                setState({ bookingsQuery: event.target.value })
              }
              placeholder="Search client or service"
            />
          </div>
          <button
            className={joinClassNames(
              styles.filterButton,
              !!view.filterCount && styles.filterButtonOn,
            )}
            onClick={() => setState({ filterOpen: true, filterOut: false })}
            aria-label="Filter bookings"
          >
            <ListFilter size={15} strokeWidth={1.8} />
            Filter
            {view.filterCount && (
              <span className={styles.filterCount}>{view.filterCount}</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

const BlockBadge = ({
  booking,
  className,
}: {
  booking: DecoratedBooking;
  className?: string;
}) =>
  booking.badge ? <span className={className}>{booking.badge}</span> : null;

const WeekView = ({ view }: { view: BookingsView }) => (
  <div className={styles.weekView} data-screen-label="Week view">
    <div className={styles.weekInner}>
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
      <div className={styles.weekScroll} data-wk-scroll="1">
        <div className={styles.weekGrid}>
          {view.weekHours.map(({ key, label, top }) => (
            <div
              key={key}
              className={styles.hourLine}
              style={asStyle({ "--top": top })}
            >
              <span className={styles.hourLabel}>{label}</span>
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
                      className={styles.band}
                      style={asStyle({ "--top": top, "--h": height })}
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
                          "--h": height,
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
                        "--h": height,
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

const DayView = ({
  studio,
  view,
}: {
  studio: StudioController;
  view: BookingsView;
}) => {
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
            className={joinClassNames(styles.band, styles.dayBand)}
            style={asStyle({ "--top": top, "--h": height })}
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
            className={styles.hourLine}
            id={`tl-h-${paddedHour}`}
            style={asStyle({ "--top": top })}
          >
            <span
              className={joinClassNames(
                styles.hourLabel,
                !isWorking && styles.hourLabelOff,
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
            style={asStyle({ "--top": top, "--h": height, "--hex": hex })}
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
              "--h": height,
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
                "--h": height,
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

const BookingsList = ({ view }: { view: BookingsView }) => (
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
                <button
                  key={booking.id}
                  className={styles.row}
                  style={asStyle({
                    "--delay": booking.delay,
                    "--stripe": booking.stripe,
                    "--badge-bg": booking.badgeBackground,
                    "--badge-border": booking.badgeBorder,
                    "--badge-color": booking.badgeColor,
                  })}
                  onClick={booking.open}
                >
                  <div className={styles.stripe}></div>
                  <div className={styles.times}>
                    <div className={styles.start}>{booking.time}</div>
                    <div className={styles.end}>{booking.endTime}</div>
                  </div>
                  <img className={styles.avatar} src={booking.imgSrc} alt="" />
                  <div className={styles.grow}>
                    <div className={styles.nameRow}>
                      <span className={styles.name}>{booking.clientName}</span>
                      {booking.badge && (
                        <span className={styles.badge}>
                          {booking.badgeDot && (
                            <span className={styles.pulse}></span>
                          )}
                          {booking.badge}
                        </span>
                      )}
                    </div>
                    <div className={styles.service}>{booking.service}</div>
                    {booking.subtitle && (
                      <div className={styles.sub}>{booking.subtitle}</div>
                    )}
                  </div>
                  <div className={styles.price}>{booking.priceLabel}</div>
                </button>
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
              <button
                key={item.key}
                className={joinClassNames(styles.row, styles.pastRow)}
                style={asStyle({
                  "--delay": item.delay,
                  "--stripe": item.stripe,
                  "--badge-bg": item.badgeBackground,
                  "--badge-color": item.badgeColor,
                })}
                onClick={item.open}
              >
                <div className={styles.stripe}></div>
                <div className={styles.times}>
                  <div className={styles.start}>{item.start}</div>
                  <div className={styles.end}>{item.endTime}</div>
                </div>
                <img
                  className={joinClassNames(
                    styles.avatar,
                    item.isFaded && styles.avatarFaded,
                  )}
                  src={item.imgSrc}
                  alt=""
                />
                <div className={styles.grow}>
                  <div className={styles.nameRow}>
                    <span className={styles.name}>{item.clientName}</span>
                    <span className={styles.pastBadge}>{item.status}</span>
                  </div>
                  <div className={styles.service}>
                    {`${item.service} · ${item.when}`}
                  </div>
                </div>
                <div className={styles.priceCell}>
                  <div
                    className={joinClassNames(
                      styles.price,
                      item.isStruck ? styles.pastPriceStruck : styles.pastPrice,
                    )}
                  >
                    {item.priceLabel}
                  </div>
                  <div className={styles.priceMeta}>{item.priceMeta}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
  </div>
);

export const StudioBookings = ({
  studio,
  view,
}: {
  studio: StudioController;
  view: BookingsView;
}) => {
  const { state, setState, isWide, isDesktop, isNew, actions } = studio;

  const copyLink = () => {
    if (isGated(studio)) {
      actions.showToast(GATE_REASON);

      return;
    }

    copyText(getBookingLink(state));
    actions.showToast("Booking link copied");
  };

  return (
    <div
      className={joinClassNames(
        styles.bookings,
        isWide && styles.wide,
        isDesktop && styles.desk,
      )}
      data-screen-label="Bookings"
    >
      <div className={styles.column}>
        <BookingsHeader studio={studio} view={view} />
        <div
          className={joinClassNames(
            styles.card,
            view.isCalendar && styles.cardCal,
          )}
        >
          {isNew && !state.calendarEmptyHidden && (
            <div className={styles.emptyHolder}>
              <div className={styles.emptyLayer}>
                <div
                  className={styles.emptyCard}
                  data-screen-label="Calendar empty"
                >
                  <button
                    className={styles.emptyClose}
                    onClick={() => setState({ calendarEmptyHidden: true })}
                    aria-label="Close"
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
                  <span className={styles.emptyIcon}>
                    <Calendar size={20} strokeWidth={2} />
                  </span>
                  <div className={styles.emptyTitle}>No appointments yet</div>
                  <div className={styles.emptyBody}>
                    Share your booking link to get your first one.
                  </div>
                  <div className={styles.emptyActions}>
                    <button className={styles.primary} onClick={copyLink}>
                      Copy booking link
                    </button>
                    <button
                      className={styles.secondary}
                      onClick={() => actions.openSheet("add")}
                    >
                      Add a booking yourself
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {view.isCalendar &&
            (view.isWeek ? (
              <WeekView view={view} />
            ) : (
              <DayView studio={studio} view={view} />
            ))}
          {view.isList && <BookingsList view={view} />}
        </div>
      </div>
    </div>
  );
};

export { getBookingsView };
