import { describe, expect, it, vi } from "vitest";
import { getRow } from "../../../../test/studio-booking-row";
import { fetchStudioBooking } from "../../../../lib/studio-api/bookings";
import { fetchStudioClients } from "../../../../lib/studio-api/clients";
import { toPastRecord } from "../../bookings/records";
import type { StudioContext } from "../actions";
import type { StudioState } from "../types";
import { watchStudio } from "../live";

const handlers = new Map<string, (change: { new: object }) => void>();

const channel = {
  on: (
    _event: string,
    { table }: { table: string },
    handler: (change: { new: object }) => void,
  ) => {
    handlers.set(table, handler);

    return channel;
  },
  subscribe: () => channel,
};

vi.mock("../../../../lib/supabase", () => ({
  supabase: { channel: () => channel, removeChannel: vi.fn() },
}));

vi.mock("../../../../lib/studio-api/bookings", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../../lib/studio-api/bookings")
  >()),
  fetchStudioBooking: vi.fn(),
}));

vi.mock("../../../../lib/studio-api/clients", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../../lib/studio-api/clients")
  >()),
  fetchStudioClients: vi.fn(async () => []),
}));

const done = (id: string) => getRow({ id, status: "completed" });

const watch = () => {
  const state = {
    bookings: [],
    pastNew: [toPastRecord(done("b-old"))],
    bookingClients: [],
    extraClients: [],
    sheet: null,
  } as unknown as StudioState;

  const context = {
    getState: () => state,
    applyState: vi.fn(),
  } as unknown as StudioContext;

  watchStudio("stylist-1", () => ({
    context,
    showToast: vi.fn(),
    closeSheet: vi.fn(),
  }));
};

const changeBooking = async (row: ReturnType<typeof getRow>) => {
  vi.mocked(fetchStudioBooking).mockResolvedValueOnce(row);
  handlers.get("bookings")?.({ new: { id: row.id } });
  await vi.waitFor(() => expect(fetchStudioBooking).toHaveBeenCalled());
  await Promise.resolve();
  vi.mocked(fetchStudioBooking).mockClear();
};

describe("watchStudio", () => {
  it("reloads the clients once when a booking is newly completed, not for one already counted", async () => {
    watch();

    await changeBooking(done("b-old"));
    expect(fetchStudioClients).not.toHaveBeenCalled();

    await changeBooking(done("b-new"));
    await vi.waitFor(() => expect(fetchStudioClients).toHaveBeenCalledTimes(1));

    await changeBooking(done("b-new"));
    expect(fetchStudioClients).toHaveBeenCalledTimes(1);
  });
});
