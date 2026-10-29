import { FunctionsHttpError } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { supabase } from "../../supabase";
import { retryFee } from "../money";

// supabase.functions makes a new client each time it's read, so the shared prototype is what can be spied on
const functionsClient = Object.getPrototypeOf(supabase.functions) as Pick<
  typeof supabase.functions,
  "invoke"
>;

const refuseWith = (reason: string) =>
  vi.spyOn(functionsClient, "invoke").mockResolvedValue({
    data: null,
    error: new FunctionsHttpError(
      new Response(JSON.stringify({ error: reason }), { status: 409 }),
    ),
    response: undefined,
  } as unknown as Awaited<ReturnType<typeof supabase.functions.invoke>>);

describe("retrying a declined fee", () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([
    ["too_soon", "You can retry 24 hours after the last try."],
    [
      "no_retries_left",
      "No retries left. Send a payment link or record the payment instead.",
    ],
    [
      "hard_decline",
      "This card can’t be charged again. Send a payment link or record the payment instead.",
    ],
    ["retry_not_allowed", "This fee can’t be retried now."],
  ])("says why it can't retry (%s)", async (reason, message) => {
    refuseWith(reason);

    await expect(retryFee("booking-1")).rejects.toThrow(message);
  });
});
