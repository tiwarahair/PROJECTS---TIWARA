import type { CSSProperties } from "react";
import { joinClassNames } from "../../utils/class-names";
import {
  dayInfo,
  durationToMinutes,
  getAvatarSrc,
  getMiniCalendarDays,
  hhmm,
  timeRange,
  timeToMinutes,
} from "./studio-format";
import type { MiniCalendarDay } from "./studio-format";
import { getClient, getServiceDuration } from "./studio-model";
import { getDialogPlacement, getOverlayAnimation } from "./studio-overlay";
import type { StudioState } from "./studio-types";
import type { StudioController } from "./use-studio";
import overlay from "../../styles/features/studio/studio-overlay.module.css";
import styles from "../../styles/features/studio/sheets-simple.module.css";
import { MONDAY_FIRST_WEEKDAYS, LONG_MONTHS } from "../../utils/dates";
import { saveBlock, saveClosedPeriod } from "../../lib/studio-api";
import {
  buildBlockedTime,
  formatClosedSpan,
  fromBlockedTime,
} from "./studio-blocked-time";

type MonthKey =
  | "blockCalendarMonth"
  | "calendarMonth"
  | "rescheduleCalendarMonth"
  | "endCalendarMonth";
type YearKey =
  | "blockCalendarYear"
  | "calendarYear"
  | "rescheduleCalendarYear"
  | "endCalendarYear";

const Arrow = ({ iconPath }: { iconPath: string }) => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={iconPath}></path>
  </svg>
);

const CalendarIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="5" width="18" height="16" rx="2"></rect>
    <path d="M16 3v4M8 3v4M3 11h18"></path>
  </svg>
);

/** Month navigation for one of the sheets' calendars; it never goes before this month. */
export const getMonthNav = (
  studio: StudioController,
  monthKey: MonthKey,
  yearKey: YearKey,
) => {
  const { state, setState } = studio;
  const now = new Date();

  const month =
    state[monthKey] == null ? now.getMonth() : (state[monthKey] as number);

  const year =
    state[yearKey] == null ? now.getFullYear() : (state[yearKey] as number);

  const rawMonth = state[monthKey] as number | null;
  const rawYear = state[yearKey] as number | null;

  const isPrevOff =
    rawYear == null ||
    rawYear < now.getFullYear() ||
    (rawYear === now.getFullYear() && (rawMonth ?? 0) <= now.getMonth());

  return {
    month,
    year,
    title: `${LONG_MONTHS[month]} ${year}`,
    isPrevOff,
    prev: () => {
      if (isPrevOff) return;

      setState(
        (rawMonth === 0
          ? { [monthKey]: 11, [yearKey]: (rawYear ?? 0) - 1 }
          : {
              [monthKey]: (rawMonth ?? 0) - 1,
              [yearKey]: rawYear,
            }) as Partial<StudioState>,
      );
    },
    next: () =>
      setState(
        (rawMonth === 11
          ? { [monthKey]: 0, [yearKey]: (rawYear ?? 0) + 1 }
          : {
              [monthKey]: (rawMonth ?? 0) + 1,
              [yearKey]: rawYear,
            }) as Partial<StudioState>,
      ),
  };
};

/** A month grid inside a sheet (block time, new booking, reschedule, repeat-until). */
export const MonthCalendar = ({
  monthNav,
  days,
  className,
  isLoose = false,
}: {
  monthNav: ReturnType<typeof getMonthNav>;
  days: MiniCalendarDay[];
  className?: string;
  /** New booking's weekday row is spaced 4px instead of 2px. */
  isLoose?: boolean;
}) => (
  <div className={joinClassNames(styles.month, className)}>
    <div className={styles.monthHead}>
      <button
        className={joinClassNames(
          styles.monthArrow,
          monthNav.isPrevOff && styles.monthArrowOff,
        )}
        onClick={monthNav.prev}
        disabled={monthNav.isPrevOff}
        aria-label="Previous month"
      >
        <Arrow iconPath="m15 18-6-6 6-6" />
      </button>
      <div className={styles.h3}>{monthNav.title}</div>
      <button
        className={styles.monthArrow}
        onClick={monthNav.next}
        aria-label="Next month"
      >
        <Arrow iconPath="m9 18 6-6-6-6" />
      </button>
    </div>
    <div className={joinClassNames(styles.dows, isLoose && styles.dowsLoose)}>
      {MONDAY_FIRST_WEEKDAYS.map((weekday) => (
        <div key={weekday} className={styles.dow}>
          {weekday}
        </div>
      ))}
    </div>
    <div className={styles.days}>
      {days.map(
        ({ key, dayNumber, disabled, background, color, weight, pick }) => (
          <button
            key={key}
            className={styles.day}
            // runtime: the day's selected / past state
            style={
              {
                "--day-bg": background,
                "--day-color": color,
                "--day-weight": weight,
              } as CSSProperties
            }
            onClick={pick}
            disabled={disabled}
          >
            {dayNumber}
          </button>
        ),
      )}
    </div>
  </div>
);

export const CalendarToggle = ({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) => (
  <button
    className={joinClassNames(styles.calToggle, isOpen && styles.calToggleOn)}
    onClick={onClick}
    aria-label="Open calendar"
  >
    <CalendarIcon />
  </button>
);

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

  return (
    <div className={styles.stack8}>
      {state.notifications.map(({ title, body, time, unread }, index) => (
        <button
          key={title}
          className={styles.notif}
          // runtime: staggered entry
          style={
            { "--delay": `${(index * 0.05).toFixed(2)}s` } as CSSProperties
          }
          onClick={handlers[index]}
        >
          <span
            className={joinClassNames(
              styles.notifDot,
              unread && !state.notifAllRead && styles.notifDotUnread,
            )}
          ></span>
          <span className={styles.grow}>
            <span className={styles.notifTop}>
              <span className={styles.notifTitle}>{title}</span>
              <span className={styles.notifTime}>{time}</span>
            </span>
            <span className={styles.notifBody}>{body}</span>
          </span>
          <svg
            className={styles.chevron}
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-secondary)"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6"></path>
          </svg>
        </button>
      ))}
    </div>
  );
};

export const StripeSheet = ({ studio }: { studio: StudioController }) => {
  const { state, setState, actions } = studio;

  const connect = () => {
    if (state.stripeBusy) return;

    setState({ stripeBusy: true });

    window.setTimeout(() => {
      setState(({ check }) => ({
        stripeBusy: false,
        check: { ...check, stripe: true },
      }));

      actions.showToast("Stripe connected. You can take payments");
      actions.closeSheet();
      actions.checkDone();
    }, 1400);
  };

  return (
    <>
      <div className={styles.stripeCard}>
        <div className={styles.title15}>Get paid with Stripe</div>
        <div className={styles.stripeBody}>
          Stripe verifies your identity and links your bank account. Deposits
          and payments land there automatically; payouts are sent daily and
          usually reach your bank in about 3 working days.
        </div>
        <div className={styles.bullets}>
          <div className={styles.bullet}>
            <span className={styles.bulletDot}></span>Bank account for payouts
          </div>
          <div className={styles.bullet}>
            <span className={styles.bulletDot}></span>Photo ID for identity
            checks
          </div>
        </div>
      </div>
      <div className={styles.filled}>
        <svg
          className={styles.noShrink}
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5"></path>
        </svg>
        We’ve filled in your details for you.
      </div>
      <button
        className={styles.stripeButton}
        onClick={connect}
        disabled={state.stripeBusy}
      >
        {state.stripeBusy && <span className={styles.spinner}></span>}
        {state.stripeBusy ? "Connecting" : "Continue with Stripe"}
      </button>
    </>
  );
};

export const BlockSheet = ({ studio }: { studio: StudioController }) => {
  const { state, setState, actions, context } = studio;
  const draft = state.blockDraft;

  const setDraft = (patch: Partial<StudioState["blockDraft"]>) =>
    setState(({ blockDraft }) => ({ blockDraft: { ...blockDraft, ...patch } }));

  const selected = draft.day || 0;
  const first = selected > 6 ? selected - 3 : 0;

  const monthNav = getMonthNav(
    studio,
    "blockCalendarMonth",
    "blockCalendarYear",
  );

  const times: string[] = [];

  for (let minutes = 6 * 60; minutes <= 23 * 60 + 45; minutes += 15)
    times.push(hhmm(minutes));

  [draft.start, draft.end].forEach((time) => {
    if (time && !times.includes(time)) times.push(time);
  });

  times.sort();
  const isDisabled = !draft.allDay && draft.start >= draft.end;
  const isRepeating = (draft.frequency || "none") !== "none";

  const endDayInfo =
    draft.endDayOffset != null ? dayInfo(draft.endDayOffset) : null;

  const save = () => {
    const current = studio.context.getState();
    const block = current.blockDraft;

    if (!block.allDay && block.start >= block.end) return;

    const from = block.allDay ? 0 : timeToMinutes(block.start);
    const to = block.allDay ? 1440 : timeToMinutes(block.end);

    const hits = current.bookings
      .filter(({ dayOffset }) => dayOffset === block.day)
      .filter((booking) => {
        const start = timeToMinutes(booking.time);

        const end =
          start +
          durationToMinutes(
            booking.duration || getServiceDuration(current, booking.service),
          );

        return start < to && end > from;
      });

    if (hits.length && !block.force) {
      const names = hits
        .map((booking) => {
          const clientFirst = getClient(current, booking.client).name.split(
            " ",
          )[0];

          const slot = timeRange(
            booking.time,
            booking.duration || getServiceDuration(current, booking.service),
          );

          return `${clientFirst} (${slot})`;
        })
        .join(", ");

      const bookingNoun = hits.length === 1 ? " booking" : " bookings";

      setState({
        confirm: {
          title: `This overlaps ${hits.length}${bookingNoun}`,
          body: `${names} stay exactly as they are. Blocking only stops new online bookings in this time.`,
          yesLabel: "Keep bookings and block",
          noLabel: "Go back",
          yes: () => {
            setState(({ blockDraft }) => ({
              confirm: null,
              blockDraft: { ...blockDraft, force: true },
            }));

            window.setTimeout(save, 0);
          },
        },
      });

      return;
    }

    const item = buildBlockedTime({
      id: block.editId || crypto.randomUUID(),
      dayIndex: block.day,
      allDay: !!block.allDay,
      start: block.start,
      end: block.end,
      note: block.reason,
      frequency: block.frequency || "none",
      ends: block.ends || "never",
      endDayOffset: block.endDayOffset,
      color: block.color || "purple",
    });

    const before = current.blocked;

    setState({
      blocked: block.editId
        ? current.blocked.map((existing) =>
            existing.id === block.editId ? item : existing,
          )
        : current.blocked.concat([item]),
    });

    context.sync?.save(
      (stylistId) => saveBlock(fromBlockedTime(item, stylistId)),
      { blocked: before },
    );

    actions.showToast(block.editId ? "Blocked time updated" : "Time blocked");
    actions.closeSheet();
  };

  return (
    <>
      <div className={styles.dayHead}>
        <div className={styles.label500}>Day</div>
        <CalendarToggle
          isOpen={state.blockCalendarOpen}
          onClick={() => {
            const today = new Date();

            setState({
              blockCalendarOpen: !state.blockCalendarOpen,
              blockCalendarMonth:
                state.blockCalendarMonth == null
                  ? today.getMonth()
                  : state.blockCalendarMonth,
              blockCalendarYear:
                state.blockCalendarYear == null
                  ? today.getFullYear()
                  : state.blockCalendarYear,
            });
          }}
        />
      </div>
      {!state.blockCalendarOpen && (
        <div className={styles.dayStrip}>
          {Array.from({ length: 7 }, (_slot, index) => {
            const offset = first + index;
            const info = dayInfo(offset);

            return (
              <button
                key={offset}
                className={joinClassNames(
                  styles.dayChip,
                  selected === offset && styles.dayChipOn,
                )}
                onClick={() => setDraft({ day: offset })}
              >
                <div className={styles.chipDow}>{info.weekday}</div>
                <div className={styles.chipNum}>{info.dayNumber}</div>
              </button>
            );
          })}
        </div>
      )}
      {state.blockCalendarOpen && (
        <MonthCalendar
          className={styles.monthIn}
          monthNav={monthNav}
          days={getMiniCalendarDays(
            monthNav.month,
            monthNav.year,
            draft.day,
            (offset) => setDraft({ day: offset }),
            0,
          )}
        />
      )}
      <button
        className={styles.allDay}
        onClick={() => setDraft({ allDay: !draft.allDay })}
      >
        <span className={styles.grow}>
          <span className={styles.allDayLabel}>All day</span>
          <span className={styles.allDayHint}>
            {draft.allDay
              ? "No online bookings at all on this day"
              : "Block just part of the day"}
          </span>
        </span>
        <span
          className={joinClassNames(
            styles.toggle,
            draft.allDay && styles.toggleOn,
          )}
        >
          <span className={styles.knob}></span>
        </span>
      </button>
      {!draft.allDay && (
        <div className={styles.times}>
          <select
            className={styles.timeSelect}
            value={draft.start}
            onChange={(event) => setDraft({ start: event.target.value })}
          >
            {times.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
          <span className={styles.to}>to</span>
          <select
            className={styles.timeSelect}
            value={draft.end}
            onChange={(event) => setDraft({ end: event.target.value })}
          >
            {times.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
      )}
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Repeats</span>
        <select
          className={styles.select}
          defaultValue={draft.frequency || "none"}
          onChange={(event) => setDraft({ frequency: event.target.value })}
        >
          <option value="none">Doesn&apos;t repeat</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </label>
      {isRepeating && (
        <>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Ends</span>
            <select
              className={styles.select}
              defaultValue={draft.ends || "never"}
              onChange={(event) => setDraft({ ends: event.target.value })}
            >
              <option value="never">Never</option>
              <option value="date">After specific date</option>
            </select>
          </label>
          {(draft.ends || "never") === "date" && (
            <button
              className={joinClassNames(
                styles.endDate,
                draft.endDayOffset != null && styles.endDateSet,
              )}
              onClick={() => {
                const today = new Date();

                setState({
                  endCalendarOpen: true,
                  endCalendarOut: false,
                  endCalendarMonth:
                    state.endCalendarMonth == null
                      ? today.getMonth()
                      : state.endCalendarMonth,
                  endCalendarYear:
                    state.endCalendarYear == null
                      ? today.getFullYear()
                      : state.endCalendarYear,
                });
              }}
            >
              {endDayInfo
                ? `${endDayInfo.weekday} ${endDayInfo.dayNumber} ${endDayInfo.monthName}`
                : "Pick a date"}
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="5" width="18" height="16" rx="2"></rect>
                <path d="M16 3v4M8 3v4M3 11h18"></path>
              </svg>
            </button>
          )}
        </>
      )}
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Reason</span>
        <input
          className={styles.input}
          value={draft.reason}
          onChange={(event) => setDraft({ reason: event.target.value })}
          placeholder="e.g. Lunch (optional)"
        />
      </label>
      <button
        className={joinClassNames(
          styles.submit,
          isDisabled && styles.submitOff,
        )}
        onClick={save}
        disabled={isDisabled}
      >
        Block this time
      </button>
    </>
  );
};

/** "Repeat until" — the block sheet's end-date calendar. */
export const EndDateDialog = ({ studio }: { studio: StudioController }) => {
  const { state, setState, isWide, context } = studio;

  if (!state.endCalendarOpen) return null;

  const close = () => {
    setState({ endCalendarOut: true });
    window.clearTimeout(context.timers.endCalendar);

    context.timers.endCalendar = window.setTimeout(
      () => setState({ endCalendarOpen: false, endCalendarOut: false }),
      210,
    );
  };

  const monthNav = getMonthNav(studio, "endCalendarMonth", "endCalendarYear");

  const days = getMiniCalendarDays(
    monthNav.month,
    monthNav.year,
    state.blockDraft.endDayOffset,
    (offset) => {
      setState(({ blockDraft }) => ({
        blockDraft: { ...blockDraft, endDayOffset: offset },
        endCalendarOut: true,
      }));

      window.clearTimeout(context.timers.endCalendar);

      context.timers.endCalendar = window.setTimeout(
        () => setState({ endCalendarOpen: false, endCalendarOut: false }),
        210,
      );
    },
    Math.max(1, (state.blockDraft.day || 0) + 1),
  );

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={joinClassNames(
          styles.endScrim,
          state.endCalendarOut ? overlay.scrimOut21 : overlay.scrimIn20,
        )}
        onClick={close}
      ></div>
      <div
        className={joinClassNames(
          styles.endDialog,
          getDialogPlacement(isWide),
          getOverlayAnimation(state.endCalendarOut, "dialog", isWide),
        )}
      >
        <div className={styles.endHead}>
          <div className={styles.h3}>Repeat until</div>
          <button className={styles.close} onClick={close} aria-label="Close">
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <MonthCalendar monthNav={monthNav} days={days} />
      </div>
    </>
  );
};

export const ClosedSheet = ({ studio }: { studio: StudioController }) => {
  const { state, setState, actions, context } = studio;
  const draft = state.closedDraft;

  const setDraft = (patch: Partial<StudioState["closedDraft"]>) =>
    setState(({ closedDraft }) => ({
      closedDraft: { ...closedDraft, ...patch },
    }));

  const isReady = !!(draft.from && draft.to);

  const save = () => {
    if (!isReady) return;

    const item = {
      id: draft.editId || crypto.randomUUID(),
      from: draft.from,
      to: draft.to,
      span: formatClosedSpan(draft.from, draft.to),
      reason: draft.reason,
    };

    const before = state.closed;

    setState({
      closed: draft.editId
        ? state.closed.map((period) =>
            period.id === draft.editId ? item : period,
          )
        : state.closed.concat([item]),
    });

    context.sync?.save(
      (stylistId) =>
        saveClosedPeriod({
          id: item.id,
          stylist_id: stylistId,
          starts_on: item.from,
          ends_on: item.to,
          reason: item.reason,
        }),
      { closed: before },
    );

    actions.showToast(
      draft.editId
        ? "Closed period updated"
        : "Closed period added. Online booking blocked",
    );

    actions.closeSheet();
  };

  return (
    <>
      <div className={styles.closedIntro}>
        Online bookings are not possible during closed periods. Existing
        bookings are unaffected.
      </div>
      <div className={styles.twoCols}>
        <label className={styles.block}>
          <span className={styles.fieldLabel}>From</span>
          <input
            className={styles.dateInput}
            type="date"
            value={draft.from}
            onChange={(event) => setDraft({ from: event.target.value })}
          />
        </label>
        <label className={styles.block}>
          <span className={styles.fieldLabel}>To</span>
          <input
            className={styles.dateInput}
            type="date"
            value={draft.to}
            onChange={(event) => setDraft({ to: event.target.value })}
          />
        </label>
      </div>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Reason</span>
        <input
          className={styles.input}
          value={draft.reason}
          onChange={(event) => setDraft({ reason: event.target.value })}
          placeholder="e.g. Holiday (optional)"
        />
      </label>
      <button
        className={joinClassNames(styles.submit, !isReady && styles.submitOff)}
        onClick={save}
        disabled={!isReady}
      >
        Add closed period
      </button>
    </>
  );
};

/** The older "Client" sheet, still reachable from the booking flow. */
export const ClientSheet = ({ studio }: { studio: StudioController }) => {
  const { state, actions, seedPast } = studio;

  if (!state.sheetClientId) return null;

  const client = getClient(state, state.sheetClientId);

  const history = seedPast
    .filter((row) => row.client === client.id)
    .map((row) => ({
      key: row.when + row.time,
      service: row.service,
      when: `${row.when} · £${row.price}`,
    }));

  const subtitleLine = [
    client.area || "",
    client.fav ? `Usually books ${client.fav}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className={styles.clientHead}>
        <img
          className={styles.clientAvatar}
          src={getAvatarSrc(client)}
          alt=""
        />
        <div className={styles.flex1}>
          <div className={styles.clientName}>{client.name}</div>
          {subtitleLine && <div className={styles.muted}>{subtitleLine}</div>}
        </div>
      </div>
      <div className={styles.clientStats}>
        <div className={styles.clientStat}>
          <div className={styles.statValue}>{client.visits || 0}</div>
          <div className={styles.statLabel}>Visits</div>
        </div>
        <div className={styles.clientStat}>
          <div className={styles.statValue}>{`£${client.spent || 0}`}</div>
          <div className={styles.statLabel}>Spent</div>
        </div>
        <div className={styles.clientStat}>
          <div className={styles.statSmall}>{client.last || "None yet"}</div>
          <div className={styles.statLabel}>Last visit</div>
        </div>
      </div>
      {history.length > 0 && (
        <>
          <div className={styles.historyTitle}>Recent appointments</div>
          <div className={styles.history}>
            {history.map(({ key, service, when }) => (
              <div key={key} className={styles.historyRow}>
                <span className={styles.bold}>{service}</span>
                <span className={styles.secondary}>{when}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {!state.clientFromBookingId && (
        <button
          className={styles.bookButton}
          onClick={() => {
            const clientId = state.sheetClientId ?? null;

            actions.closeSheet();

            window.setTimeout(() => {
              actions.openSheet("add", {
                addStep: 2,
                addClient: clientId,
                addService: null,
                addDay: null,
                addTime: null,
                addCustom: false,
              });
            }, 230);
          }}
        >
          Book an appointment
        </button>
      )}
    </>
  );
};
