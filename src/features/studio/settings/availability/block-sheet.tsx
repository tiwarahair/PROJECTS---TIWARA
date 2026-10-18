import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, X } from "lucide-react";
import { joinClassNames } from "../../../../utils/class-names";
import {
  dayInfo,
  durationToMinutes,
  getMiniCalendarDays,
  hhmm,
  timeRange,
  timeToMinutes,
} from "../../core/format";
import { getClient, getServiceDuration } from "../../core/model";
import { getDialogPlacement, getOverlayAnimation } from "../../shell/overlay";
import type { StudioState } from "../../core/types";
import type { StudioController } from "../../core/use-studio";
import overlay from "../../../../styles/features/studio/shell/overlay.module.css";
import styles from "../../../../styles/features/studio/settings/availability/block-sheet.module.css";
import fields from "../../../../styles/features/studio/settings/availability/sheet-fields.module.css";
import { saveBlock } from "../../../../lib/studio-api/settings";
import { buildBlockedTime, fromBlockedTime } from "../../core/blocked-time";
import {
  getMonthNav,
  MonthCalendar,
  CalendarToggle,
} from "../../shell/month-calendar";
import { blockSchema, isBlockTimeValid } from "./block-schema";
import type { BlockValues } from "./block-schema";

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

  const {
    trigger,
    formState: { errors },
  } = useForm<BlockValues>({
    values: { allDay: !!draft.allDay, start: draft.start, end: draft.end },
    resetOptions: { keepErrors: true },
    resolver: zodResolver(blockSchema),
  });

  useEffect(() => {
    void trigger();
  }, [draft.allDay, draft.start, draft.end, trigger]);

  const isDisabled = !isBlockTimeValid(draft);
  const isRepeating = (draft.frequency || "none") !== "none";

  const endDayInfo =
    draft.endDayOffset != null ? dayInfo(draft.endDayOffset) : null;

  const save = () => {
    const current = studio.context.getState();
    const block = current.blockDraft;

    if (!isBlockTimeValid(block)) return;

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
      {!draft.allDay && errors.end?.message && (
        <span className={fields.fieldError} role="alert">
          {errors.end.message}
        </span>
      )}
      <label className={fields.field}>
        <span className={fields.fieldLabel}>Repeats</span>
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
          <label className={fields.field}>
            <span className={fields.fieldLabel}>Ends</span>
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
              <Calendar size={15} strokeWidth={1.7} />
            </button>
          )}
        </>
      )}
      <label className={fields.field}>
        <span className={fields.fieldLabel}>Reason</span>
        <input
          className={fields.input}
          value={draft.reason}
          onChange={(event) => setDraft({ reason: event.target.value })}
          placeholder="e.g. Lunch (optional)"
        />
      </label>
      <button
        className={joinClassNames(
          fields.submit,
          isDisabled && fields.submitOff,
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
            <X size={19} strokeWidth={2} />
          </button>
        </div>
        <MonthCalendar monthNav={monthNav} days={days} />
      </div>
    </>
  );
};
