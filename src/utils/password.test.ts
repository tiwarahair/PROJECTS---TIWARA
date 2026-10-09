import { describe, expect, it } from "vitest";
import {
  checkPassword,
  isPasswordCheckerReady,
  onPasswordCheckerReady,
} from "./password";

const waitForChecker = () =>
  new Promise<void>((resolve) => {
    const unsubscribe = onPasswordCheckerReady(() => {
      unsubscribe();
      resolve();
    });
    if (isPasswordCheckerReady()) resolve();
  });

describe("checkPassword with zxcvbn loaded", () => {
  it("scores strength once the checker is ready", async () => {
    await waitForChecker();
    const weak = checkPassword("aaaaaaaaaaaaaaaa");
    expect(weak.score).toBeLessThanOrEqual(2);
    expect(weak.level).toBe(0);
    expect(weak.label).toBe("Weak");

    const strong = checkPassword("velvet-quartz-harbour-71");
    expect(strong.score).toBe(4);
    expect(strong.level).toBe(2);
    expect(strong.ok).toBe(true);
  });

  it("keeps blocklist and length failures Weak regardless of score", async () => {
    await waitForChecker();
    expect(
      checkPassword("Nia Okafor 2026!!", { first: "Nia", last: "Okafor" })
        .blockKind,
    ).toBe("name");
    expect(checkPassword("short1!", { min: 8 })).toMatchObject({
      level: 0,
      error: "Use at least 8 characters",
    });
  });
});
