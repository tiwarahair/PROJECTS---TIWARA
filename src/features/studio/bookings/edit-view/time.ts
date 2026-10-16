import type { ChangeEvent } from "react";
import { hhmm } from "../../core/format";
import { HOUR_OPTIONS, MINUTE_OPTIONS } from "../add/types";
import type { EditContext } from "./context";

const getClashText = (
  time: number,
  firstClash: EditContext["clashes"][number] | undefined,
) => {
  if (!firstClash) return "";

  const clashTime = hhmm(time);

  // shows the clashing booking's client id here, not the name (kept on purpose)
  const clashWho =
    firstClash.kind === "booking"
      ? ` · ${firstClash.booking?.client}`
      : ` · ${firstClash.block?.reason || "blocked"}`;

  return `Not available at ${clashTime}${clashWho}`;
};

const getTimeOptions = ({ draft, open, close, span }: EditContext) => {
  const timeOptions: { key: number; value: string; label: string }[] = [];

  for (let start = open; start + span <= close; start += 5)
    timeOptions.push({ value: String(start), label: hhmm(start), key: start });

  if (draft.time != null && !timeOptions.some(({ key }) => key === draft.time))
    timeOptions.push({
      value: String(draft.time),
      label: hhmm(draft.time),
      key: draft.time,
    });

  return timeOptions.sort((first, second) => first.key - second.key);
};

const getNextFree = ({
  draft,
  open,
  close,
  span,
  busy,
  patchServiceEdit,
}: EditContext) => {
  const isFree = (start: number) =>
    start >= open &&
    start + span <= close &&
    !busy.some(
      ({ startMinutes, endMinutes }) =>
        startMinutes < start + span && endMinutes > start,
    );

  const nextFree: { key: number; label: string; pick: () => void }[] = [];

  for (
    let start = (draft.time || open) + 5;
    start + span <= close && nextFree.length < 3;
    start += 5
  )
    if (isFree(start)) {
      const value = start;

      nextFree.push({
        key: value,
        label: hhmm(value),
        pick: () => patchServiceEdit({ time: value }),
      });
    }

  return nextFree;
};

export const getTimeView = (context: EditContext) => {
  const { draft, duration, clashes, patchServiceEdit } = context;

  return {
    time: String(draft.time),
    timeOptions: getTimeOptions(context),
    onTime: (event: ChangeEvent<HTMLSelectElement>) =>
      patchServiceEdit({ time: Number(event.target.value) }),
    hasClash: clashes.length > 0,
    clashText: getClashText(draft.time, clashes[0]),
    nextFree: getNextFree(context),
    durationHours: String(Math.floor(duration / 60)),
    durationMinutes: String(duration % 60),
    hourOptions: HOUR_OPTIONS,
    minuteOptions: MINUTE_OPTIONS,
    onDurationHours: (event: ChangeEvent<HTMLSelectElement>) =>
      patchServiceEdit({
        duration: Math.max(
          5,
          Number(event.target.value) * 60 + (duration % 60),
        ),
      }),
    onDurationMinutes: (event: ChangeEvent<HTMLSelectElement>) =>
      patchServiceEdit({
        duration: Math.max(
          5,
          Math.floor(duration / 60) * 60 + Number(event.target.value),
        ),
      }),
  };
};
