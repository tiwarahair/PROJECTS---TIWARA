import type { CSSProperties } from "react";
import { joinClassNames } from "../../utils/class-names";
import { MONTHS, MONTHS_LONG, NOTIFS } from "./studio-data";
import {
  dayInfo,
  durToMin,
  getAvatarSrc,
  getMiniCalDays,
  hhmm,
  timeRange,
  toMin,
} from "./studio-format";
import type { MiniCalDay } from "./studio-format";
import { getClient, getServiceDur } from "./studio-model";
import { getDialogPlacement, getOverlayAnimation } from "./studio-overlay";
import type { StudioState } from "./studio-types";
import type { StudioController } from "./use-studio";
import overlay from "./studio-overlay.module.css";
import styles from "./sheets-simple.module.css";

const CAL_DOWS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
type MonthKey = "blCalM" | "calM" | "rsCalM" | "ecM";
type YearKey = "blCalY" | "calY" | "rsCalY" | "ecY";

const Arrow = ({ d }: { d: string }) => (
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
    <path d={d}></path>
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

/** Month navigation for one of the sheets' calendars; it never goes before this month (prototype *CalPrev / *Next). */
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
    title: MONTHS_LONG[month] + " " + year,
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
  nav,
  days,
  className,
  isLoose = false,
}: {
  nav: ReturnType<typeof getMonthNav>;
  days: MiniCalDay[];
  className?: string;
  /** New booking's weekday row is spaced 4px instead of 2px. */
  isLoose?: boolean;
}) => (
  <div className={joinClassNames(styles.month, className)}>
    <div className={styles.monthHead}>
      <button
        className={joinClassNames(
          styles.monthArrow,
          nav.isPrevOff && styles.monthArrowOff,
        )}
        onClick={nav.prev}
        disabled={nav.isPrevOff}
        aria-label="Previous month"
      >
        <Arrow d="m15 18-6-6 6-6" />
      </button>
      <div className={styles.h3}>{nav.title}</div>
      <button
        className={styles.monthArrow}
        onClick={nav.next}
        aria-label="Next month"
      >
        <Arrow d="m9 18 6-6-6-6" />
      </button>
    </div>
    <div className={joinClassNames(styles.dows, isLoose && styles.dowsLoose)}>
      {CAL_DOWS.map((dow) => (
        <div key={dow} className={styles.dow}>
          {dow}
        </div>
      ))}
    </div>
    <div className={styles.days}>
      {days.map(({ key, n, off, bg, color, weight, pick }) => (
        <button
          key={key}
          className={styles.day}
          // runtime: the day's selected / past state
          style={
            {
              "--day-bg": bg,
              "--day-color": color,
              "--day-weight": weight,
            } as CSSProperties
          }
          onClick={pick}
          disabled={off}
        >
          {n}
        </button>
      ))}
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
        bview: "list",
        listScope: "past",
        pastFilter: "off",
      }),
    ),
    deepLink(() => {
      setState({ tab: "bookings", dayIdx: 3, bview: "cal" });
      actions.openSheet("booking", { sheetBId: 4 });
    }),
    deepLink(() => {
      if (isWide) {
        setState({ tab: "clients" });
        actions.openSheet("cliView", { cliSel: "kemi", cliApptTab: "past" });
      } else setState({ tab: "clients", cliSel: "kemi", cliApptTab: "past" });
    }),
    deepLink(() => setState({ tab: "earnings" })),
    deepLink(() => {
      setState({ tab: "bookings", dayIdx: 0, bview: "cal" });
      actions.openSheet("booking", { sheetBId: 1 });
    }),
  ];
  return (
    <div className={styles.stack8}>
      {NOTIFS.map(({ title, body, time, unread }, index) => (
        <button
          key={title}
          className={styles.notif}
          // runtime: staggered entry
          style={
            { "--delay": (index * 0.05).toFixed(2) + "s" } as CSSProperties
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
      actions.toastMsg("Stripe connected. You can take payments");
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

const FREQ_LABELS: Record<string, string> = {
  none: "",
  daily: "Repeats daily",
  weekly: "Repeats weekly",
  monthly: "Repeats monthly",
};

export const BlockSheet = ({ studio }: { studio: StudioController }) => {
  const { state, setState, actions } = studio;
  const draft = state.blockDraft;
  const setDraft = (patch: Partial<StudioState["blockDraft"]>) =>
    setState(({ blockDraft }) => ({ blockDraft: { ...blockDraft, ...patch } }));
  const selected = draft.day || 0;
  const first = selected > 6 ? selected - 3 : 0;
  const nav = getMonthNav(studio, "blCalM", "blCalY");
  const times: string[] = [];
  for (let minutes = 6 * 60; minutes <= 23 * 60 + 45; minutes += 15)
    times.push(hhmm(minutes));
  [draft.start, draft.end].forEach((time) => {
    if (time && !times.includes(time)) times.push(time);
  });
  times.sort();
  const isDisabled = !draft.allDay && draft.start >= draft.end;
  const isRepeating = (draft.freq || "none") !== "none";
  const endInfo = draft.endOff != null ? dayInfo(draft.endOff) : null;
  const save = () => {
    const current = studio.context.getState();
    const block = current.blockDraft;
    if (!block.allDay && block.start >= block.end) return;
    const from = block.allDay ? 0 : toMin(block.start);
    const to = block.allDay ? 1440 : toMin(block.end);
    const hits = current.bookings
      .filter(({ off }) => off === block.day)
      .filter((booking) => {
        const start = toMin(booking.time);
        const end =
          start + durToMin(booking.dur || getServiceDur(current, booking.svc));
        return start < to && end > from;
      });
    if (hits.length && !block.force) {
      const names = hits
        .map(
          (booking) =>
            getClient(current, booking.client).name.split(" ")[0] +
            " (" +
            timeRange(
              booking.time,
              booking.dur || getServiceDur(current, booking.svc),
            ) +
            ")",
        )
        .join(", ");
      setState({
        confirm: {
          title:
            "This overlaps " +
            hits.length +
            (hits.length === 1 ? " booking" : " bookings"),
          body:
            names +
            " stay exactly as they are. Blocking only stops new online bookings in this time.",
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
    const info = dayInfo(block.day);
    const frequency = block.freq || "none";
    let frequencyLabel = FREQ_LABELS[frequency] ?? "";
    if (
      frequencyLabel &&
      (block.ends || "never") === "date" &&
      block.endOff != null
    ) {
      const end = dayInfo(block.endOff);
      frequencyLabel += " until " + end.num + " " + end.mon;
    }
    const item = {
      id: block.editId || Date.now(),
      day: info.dow + " " + info.num + " " + info.mon,
      dayIdx: block.day,
      span: block.allDay ? "All day" : block.start + " to " + block.end,
      freq: frequency,
      ends: block.ends || "never",
      endOff: block.endOff,
      color: block.color || "purple",
      reason:
        [block.reason, frequencyLabel].filter(Boolean).join(" · ") ||
        block.reason,
    };
    setState({
      blocked: block.editId
        ? current.blocked.map((existing) =>
            existing.id === block.editId ? item : existing,
          )
        : current.blocked.concat([item]),
    });
    actions.toastMsg(block.editId ? "Blocked time updated" : "Time blocked");
    actions.closeSheet();
  };
  return (
    <>
      <div className={styles.dayHead}>
        <div className={styles.label500}>Day</div>
        <CalendarToggle
          isOpen={state.blCalOpen}
          onClick={() => {
            const today = new Date();
            setState({
              blCalOpen: !state.blCalOpen,
              blCalM: state.blCalM == null ? today.getMonth() : state.blCalM,
              blCalY: state.blCalY == null ? today.getFullYear() : state.blCalY,
            });
          }}
        />
      </div>
      {!state.blCalOpen && (
        <div className={styles.dayStrip}>
          {Array.from({ length: 7 }, (_, index) => {
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
                <div className={styles.chipDow}>{info.dow}</div>
                <div className={styles.chipNum}>{info.num}</div>
              </button>
            );
          })}
        </div>
      )}
      {state.blCalOpen && (
        <MonthCalendar
          className={styles.monthIn}
          nav={nav}
          days={getMiniCalDays(
            nav.month,
            nav.year,
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
          defaultValue={draft.freq || "none"}
          onChange={(event) => setDraft({ freq: event.target.value })}
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
                draft.endOff != null && styles.endDateSet,
              )}
              onClick={() => {
                const today = new Date();
                setState({
                  endCal: true,
                  endCalOut: false,
                  ecM: state.ecM == null ? today.getMonth() : state.ecM,
                  ecY: state.ecY == null ? today.getFullYear() : state.ecY,
                });
              }}
            >
              {endInfo
                ? endInfo.dow + " " + endInfo.num + " " + endInfo.mon
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

/** "Repeat until" — the block sheet's end-date calendar (prototype endCal). */
export const EndDateDialog = ({ studio }: { studio: StudioController }) => {
  const { state, setState, isWide, context } = studio;
  if (!state.endCal) return null;
  const close = () => {
    setState({ endCalOut: true });
    window.clearTimeout(context.timers.endCal);
    context.timers.endCal = window.setTimeout(
      () => setState({ endCal: false, endCalOut: false }),
      210,
    );
  };
  const nav = getMonthNav(studio, "ecM", "ecY");
  const days = getMiniCalDays(
    nav.month,
    nav.year,
    state.blockDraft.endOff,
    (offset) => {
      setState(({ blockDraft }) => ({
        blockDraft: { ...blockDraft, endOff: offset },
        endCalOut: true,
      }));
      window.clearTimeout(context.timers.endCal);
      context.timers.endCal = window.setTimeout(
        () => setState({ endCal: false, endCalOut: false }),
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
          state.endCalOut ? overlay.scrimOut21 : overlay.scrimIn20,
        )}
        onClick={close}
      ></div>
      <div
        className={joinClassNames(
          styles.endDialog,
          getDialogPlacement(isWide),
          getOverlayAnimation(state.endCalOut, "dlg", isWide),
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
        <MonthCalendar nav={nav} days={days} />
      </div>
    </>
  );
};

export const ClosedSheet = ({ studio }: { studio: StudioController }) => {
  const { state, setState, actions } = studio;
  const draft = state.closedDraft;
  const setDraft = (patch: Partial<StudioState["closedDraft"]>) =>
    setState(({ closedDraft }) => ({
      closedDraft: { ...closedDraft, ...patch },
    }));
  const isReady = !!(draft.from && draft.to);
  const save = () => {
    if (!isReady) return;
    const format = (value: string) => {
      const date = new Date(value + "T12:00:00");
      return date.getDate() + " " + MONTHS[date.getMonth()];
    };
    const item = {
      id: draft.editId || Date.now(),
      from: draft.from,
      to: draft.to,
      span: format(draft.from) + " to " + format(draft.to),
      reason: draft.reason,
    };
    setState({
      closed: draft.editId
        ? state.closed.map((period) =>
            period.id === draft.editId ? item : period,
          )
        : state.closed.concat([item]),
    });
    actions.toastMsg(
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

/** The older "Client" sheet (prototype sheetC), still reachable from the booking flow. */
export const ClientSheet = ({ studio }: { studio: StudioController }) => {
  const { state, actions, seedPast } = studio;
  if (!state.sheetCId) return null;
  const client = getClient(state, state.sheetCId);
  const history = seedPast
    .filter((row) => row.client === client.id)
    .map((row) => ({
      key: row.when + row.time,
      svc: row.svc,
      when: row.when + " · £" + row.price,
    }));
  const subLine = [
    client.area || "",
    client.fav ? "Usually books " + client.fav : "",
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
          {subLine && <div className={styles.muted}>{subLine}</div>}
        </div>
      </div>
      <div className={styles.clientStats}>
        <div className={styles.clientStat}>
          <div className={styles.statValue}>{client.visits || 0}</div>
          <div className={styles.statLabel}>Visits</div>
        </div>
        <div className={styles.clientStat}>
          <div className={styles.statValue}>{"£" + (client.spent || 0)}</div>
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
            {history.map(({ key, svc, when }) => (
              <div key={key} className={styles.historyRow}>
                <span className={styles.bold}>{svc}</span>
                <span className={styles.secondary}>{when}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {!state.cFromB && (
        <button
          className={styles.bookButton}
          onClick={() => {
            const clientId = state.sheetCId ?? null;
            actions.closeSheet();
            window.setTimeout(() => {
              actions.closeSub();
              actions.openSheet("add", {
                addStep: 2,
                addClient: clientId,
                addSvc: null,
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
