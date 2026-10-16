import { PAST_TONE } from "../core/constants";
import {
  durationToMinutes,
  getAvatarSrc,
  timeRange,
  timeToMinutes,
} from "../core/format";
import {
  getClient,
  getPastKey,
  getServiceDuration,
  getTileTone,
} from "../core/model";
import type { PastRecord } from "../core/types";
import type { StudioController } from "../core/use-studio";

const QUIET_TONE = {
  background: "var(--quiet)",
  color: "var(--text-secondary)",
  meta: "",
};

const getEndTime = (start: string, duration: string) => {
  const end = timeToMinutes(start) + durationToMinutes(duration);
  const endHours = String(Math.floor(end / 60) % 24).padStart(2, "0");
  const endMinutes = String(end % 60).padStart(2, "0");

  return `–${endHours}:${endMinutes}`;
};

export const getPastItem = (
  { state, actions }: StudioController,
  row: PastRecord,
  index: number,
) => {
  const client = getClient(state, row.client);
  const tone = PAST_TONE[row.status] ?? QUIET_TONE;
  const isCompleted = row.status === "Completed";
  const isFresh = !!row.at && Date.now() - row.at < 86400000;
  const duration = row.duration || getServiceDuration(state, row.service);
  const feeMeta = isFresh ? "Fee pending" : `${row.feeLabel} fee kept`;
  const settledMeta = row.meta || (isCompleted ? "Paid" : tone.meta);

  return {
    key: String(getPastKey(row)),
    clientName: client.name,
    imgSrc: getAvatarSrc(client),
    isFaded: !isCompleted,
    service: row.service,
    when: row.when,
    time: timeRange(row.time, duration),
    start: row.time,
    endTime: getEndTime(row.time, duration),
    stripe: getTileTone(state, row.service).bar,
    status: row.status,
    badgeBackground: tone.background,
    badgeColor: tone.color,
    open: () => actions.openSheet("past", { selectedPastId: getPastKey(row) }),
    priceLabel: `£${row.price}`,
    isStruck: !isCompleted,
    priceMeta: row.feePending && !row.waived ? feeMeta : settledMeta,
    delay: `${(index * 0.04).toFixed(2)}s`,
  };
};
