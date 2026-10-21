import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStudioBooking } from "../../../../lib/studio-api/booking-writes";
import {
  fetchStudioBooking,
  setBookingStatus,
} from "../../../../lib/studio-api/bookings";
import { getRow } from "../../../../test/studio-booking-row";
import { createBookingActions } from "../../core/actions/bookings";
import type { StudioContext } from "../../core/actions/context";
import { getInitialStudioState } from "../../core/initial-state";
import { createStudioSync } from "../../core/sync";
import type { StudioPatch, StudioState } from "../../core/types";
import { confirmBooking } from "../add/confirm";
import type { AddContext } from "../add/context";

vi.mock(
  "../../../../lib/studio-api/booking-writes",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("../../../../lib/studio-api/booking-writes")
    >()),
    createStudioBooking: vi.fn(),
  }),
);

vi.mock("../../../../lib/studio-api/bookings", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../../lib/studio-api/bookings")
  >()),
  fetchStudioBooking: vi.fn(),
  setBookingStatus: vi.fn(() => Promise.resolve()),
}));

const getStudio = () => {
  let state: StudioState = {
    ...getInitialStudioState(),
    addWalkIn: true,
    addDay: 0,
    addTime: "15:00",
  };

  const setState = (patch: StudioPatch) => {
    state = {
      ...state,
      ...(typeof patch === "function" ? patch(state) : patch),
    };
  };

  const showToast = vi.fn();
  const sync = createStudioSync("stylist-1", setState, showToast);
  const getState = () => state;

  const context = {
    getState,
    setState,
    sync,
    memo: {},
  } as unknown as StudioContext;

  const add = () =>
    confirmBooking({
      state,
      setState,
      actions: { showToast, closeSheet: vi.fn() },
      service: { id: "s-1", name: "Silk press" },
      studio: { context },
      overrides: {},
      selectedAddons: [],
      duration: 90,
      price: 65,
      hasStarted: false,
      isProtectionSkipped: true,
      isLinkTooLate: false,
    } as unknown as AddContext);

  const { setStatus } = createBookingActions(context, {
    showToast,
    openSheet: vi.fn(),
    closeSheet: vi.fn(),
  });

  return { getState, setState, showToast, add, setStatus };
};

const holdCreate = () => {
  let finish: (id: string | null) => void = () => {};

  const promise = new Promise<{ id: string }>((resolve, reject) => {
    finish = (id) => (id ? resolve({ id }) : reject(new Error("offline")));
  });

  vi.mocked(createStudioBooking).mockReturnValue(promise);

  return (id: string | null) => finish(id);
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("a change to a booking that's still saving", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves after the booking does, against its new id, and keeps the booking open", async () => {
    const finishCreate = holdCreate();
    const studio = getStudio();

    studio.add();

    const [added] = studio.getState().bookings;
    const localId = added?.id ?? 0;

    studio.setState({ sheet: "booking", sheetBookingId: localId });
    studio.setStatus(localId, "arrived", "Marked as arrived");

    expect(studio.showToast).toHaveBeenCalledWith(
      "Marked as arrived",
      expect.any(Function),
    );

    expect(studio.getState().bookings[0]?.status).toBe("arrived");
    expect(setBookingStatus).not.toHaveBeenCalled();

    vi.mocked(fetchStudioBooking).mockResolvedValue(
      getRow({ id: "b-new", status: "arrived" }),
    );

    finishCreate("b-new");
    await settle();

    expect(setBookingStatus).toHaveBeenCalledWith("b-new", "arrived");

    const { bookings, sheetBookingId } = studio.getState();

    expect(bookings).toHaveLength(1);

    expect(bookings[0]).toMatchObject({
      id: sheetBookingId,
      remoteId: "b-new",
      status: "arrived",
    });
  });

  it("is put back when the booking itself didn't save", async () => {
    const finishCreate = holdCreate();
    const studio = getStudio();

    studio.add();

    const localId = studio.getState().bookings[0]?.id ?? 0;

    studio.setStatus(localId, "arrived", "Marked as arrived");
    finishCreate(null);
    await settle();

    expect(setBookingStatus).not.toHaveBeenCalled();
    expect(studio.getState().bookings).toHaveLength(0);

    expect(studio.showToast).toHaveBeenCalledWith(
      "That booking didn’t save, so this change wasn’t made.",
    );
  });
});
