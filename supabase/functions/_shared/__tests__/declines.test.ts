import { describe, expect, it } from "vitest";
import { cannotRetry, getCardLabel, isHardDecline } from "../declines";

describe("declines", () => {
  it("never retries a lost, stolen or blocked card", () => {
    expect(isHardDecline("stolen_card")).toBe(true);
    expect(isHardDecline("do_not_try_again")).toBe(true);
  });

  it("can retry a soft decline", () => {
    expect(isHardDecline("insufficient_funds")).toBe(false);
    expect(isHardDecline(null)).toBe(false);
  });

  it("a card the bank wants the client to approve can't be retried, only paid by link", () => {
    expect(cannotRetry("authentication_required")).toBe(true);
    expect(cannotRetry("stolen_card")).toBe(true);
    expect(cannotRetry("insufficient_funds")).toBe(false);
  });

  it("names the card", () => {
    expect(getCardLabel("visa", "4242")).toBe("Visa •••• 4242");
    expect(getCardLabel(null, "4242")).toBeNull();
  });
});
