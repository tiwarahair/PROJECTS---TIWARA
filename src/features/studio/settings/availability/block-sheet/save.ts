import {
  durationToMinutes,
  timeRange,
  timeToMinutes,
} from "../../../core/format";
import { getBookingDuration, getClient } from "../../../core/model";
import type { StudioController } from "../../../core/use-studio";
import { saveBlock } from "../../../../../lib/studio-api";
import { buildBlockedTime, fromBlockedTime } from "../../../core/blocked-time";
import { isBlockTimeValid } from "../block-schema";

export const saveBlockDraft = (studio: StudioController) => {
  const { setState, actions, context } = studio;
  const current = context.getState();
  const block = current.blockDraft;

  if (!isBlockTimeValid(block)) return;

  const from = block.allDay ? 0 : timeToMinutes(block.start);
  const to = block.allDay ? 1440 : timeToMinutes(block.end);

  const hits = current.bookings
    .filter(({ dayOffset }) => dayOffset === block.day)
    .filter((booking) => {
      const start = timeToMinutes(booking.time);

      const end =
        start + durationToMinutes(getBookingDuration(current, booking));

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
          getBookingDuration(current, booking),
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

          window.setTimeout(() => saveBlockDraft(studio), 0);
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
