import { afterEach, describe, expect, it, vi } from "vitest";
import { supabase } from "../../supabase";
import { skipReviewInvite } from "../booking-writes";

describe("Didn't attend", () => {
  afterEach(() => vi.restoreAllMocks());

  it("says plainly when the review request has already gone out", async () => {
    vi.spyOn(supabase, "rpc").mockResolvedValue({
      data: null,
      error: { message: "skip_not_allowed" },
    } as unknown as Awaited<ReturnType<typeof supabase.rpc>>);

    await expect(skipReviewInvite("booking-1")).rejects.toThrow(
      "Too late to stop it: the review request has already been emailed to the client.",
    );
  });
});
