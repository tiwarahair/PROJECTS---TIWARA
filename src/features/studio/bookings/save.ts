// A change to a booking just added in Studio waits for the booking's own save, then saves against its new id
import { fetchStudioBooking } from "../../../lib/studio-api/bookings";
import type { StudioBookingRow } from "../../../lib/studio-api/bookings";
import { SaveError } from "../../../lib/studio-writes";
import type { StudioContext } from "../core/actions/context";
import type { StudioBooking, StudioPatch, StudioState } from "../core/types";
import { mergeBookingRows } from "./live-records";
import { getRemoteId } from "./records";

type BookingLists = Pick<StudioState, "bookings" | "pastNew">;

// how many changes are queued behind each new booking's save, by its local id
const waiting = new Map<number, number>();

export const isWaiting = (localId: number) => (waiting.get(localId) ?? 0) > 0;

export const removeLocal = (
  { bookings, pastNew }: BookingLists,
  localId: number,
) => ({
  bookings: bookings.filter(({ id }) => id !== localId),
  pastNew: pastNew.filter(({ original }) => original?.id !== localId),
});

/** marks a booking saved while changes queued behind it still run; a live copy that got in first is dropped. */
export const keepRemoteId = (
  { bookings, pastNew }: BookingLists,
  localId: number,
  remoteId: string,
) => ({
  bookings: bookings
    .filter((item) => item.remoteId !== remoteId)
    .map((item) => (item.id === localId ? { ...item, remoteId } : item)),
  pastNew: pastNew.map((item) =>
    item.original?.id === localId ? { ...item, remoteId } : item,
  ),
});

/** The server's copy of a booking in place of the one shown, under the same local id. */
export const replaceWithRow = (
  current: StudioState,
  localId: number,
  row: StudioBookingRow,
) => mergeBookingRows({ ...current, ...removeLocal(current, localId) }, [row]);

const refresh = async (
  setState: StudioContext["setState"],
  localId: number,
  remoteId: string,
) => {
  const row = await fetchStudioBooking(remoteId).catch(() => null);

  if (row) setState((current) => replaceWithRow(current, localId, row));
};

/** Saves a change to a booking; one made while the booking itself is still saving runs after it. */
export const saveToBooking = (
  { setState, sync }: Pick<StudioContext, "setState" | "sync">,
  { id: localId, remoteId }: Pick<StudioBooking, "id" | "remoteId">,
  task: (remoteId: string) => Promise<unknown>,
  revert: StudioPatch,
) => {
  if (remoteId) return sync.save(() => task(remoteId), revert);

  waiting.set(localId, (waiting.get(localId) ?? 0) + 1);

  sync.save(
    async () => {
      const savedId = getRemoteId(localId);

      try {
        if (!savedId)
          throw new SaveError(
            "That booking didn’t save, so this change wasn’t made.",
          );

        await task(savedId);
      } finally {
        waiting.set(localId, (waiting.get(localId) ?? 1) - 1);

        if (savedId && !isWaiting(localId))
          await refresh(setState, localId, savedId);
      }
    },
    (current) => (getRemoteId(localId) ? {} : removeLocal(current, localId)),
  );
};
