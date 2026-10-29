import { describe, expect, it, vi } from "vitest";
import type { StudioController } from "../../../core/use-studio";
import { saveToBooking } from "../../save";
import { getContext } from "../context";

vi.mock("../../save", () => ({ saveToBooking: vi.fn() }));
vi.mock("../checkout-view", () => ({ STILL_SAVING: "" }));
vi.mock("../../../core/model", () => ({ getPolicyFee: () => 0 }));

vi.mock("../booking", () => ({
  getAddonLines: () => [],
  getPaymentMode: () => "none",
  getSheetBooking: () => ({
    id: 1,
    dayOffset: 0,
    startMinutes: 600,
    client: "c1",
    service: "Silk press",
    price: 50,
    durationLabel: "1 hr",
    time: "10:00",
    firstName: "Ada",
  }),
}));

const getStudio = () => {
  const state = {
    sheet: "booking",
    sheetBookingId: 1,
    bookings: [{ id: 1, remoteId: "b1" }],
    pastNew: [],
    policy: { window: 24 },
  };

  return {
    state,
    setState: vi.fn(),
    actions: { showToast: vi.fn(), closeSheet: vi.fn() },
    context: { getState: () => state, memo: {} },
  } as unknown as StudioController;
};

describe("booking sheet → finishing a booking", () => {
  it("tells the save it was undone, so a late server copy doesn't put it back in Past", async () => {
    const studio = getStudio();
    const save = vi.fn();

    getContext(studio)?.finish({}, "Checkout complete", {
      save,
      undo: vi.fn(),
    });

    const task = vi.mocked(saveToBooking).mock.calls[0]?.[2];
    const onUndo = vi.mocked(studio.actions.showToast).mock.calls[0]?.[1];

    onUndo?.();
    await task?.("b1");

    const [remoteId, isUndone] = save.mock.calls[0] ?? [];

    expect(remoteId).toBe("b1");
    expect(isUndone?.()).toBe(true);
  });
});
