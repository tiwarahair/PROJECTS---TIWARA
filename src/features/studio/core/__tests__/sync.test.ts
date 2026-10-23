import { describe, expect, it, vi } from "vitest";
import { SaveError } from "../../../../lib/studio-writes";
import { createStudioSync } from "../sync";

const runFailedSave = async (error: Error) => {
  const setState = vi.fn();
  const notify = vi.fn();
  const sync = createStudioSync("stylist-1", setState, notify);

  sync.save(() => Promise.reject(error), { bookings: [] });
  await vi.waitFor(() => expect(notify).toHaveBeenCalled());

  return { setState, notify };
};

describe("createStudioSync", () => {
  it("puts the screen back and says why when a save is refused", async () => {
    const { setState, notify } = await runFailedSave(
      new SaveError("That time was just booked. Pick another time."),
    );

    expect(setState).toHaveBeenCalledWith({ bookings: [] });

    expect(notify).toHaveBeenCalledWith(
      "That time was just booked. Pick another time.",
    );
  });

  it("falls back to the connection message for other failures", async () => {
    const { notify } = await runFailedSave(new Error("fetch failed"));

    expect(notify).toHaveBeenCalledWith(
      "That change didn’t save. Check your connection and try again.",
    );
  });
});
