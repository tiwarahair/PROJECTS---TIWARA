import { afterEach, describe, expect, it, vi } from "vitest";
import { isPwnedPassword } from "../pwned-password";

// SHA-1 of "password" is 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
const PREFIX = "5BAA6";
const SUFFIX = "1E4C9B93F3F0682250B6CF8331B7EE68FD8";

const answerWith = (body: string, ok = true) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok, text: async () => body })),
  );

describe("isPwnedPassword", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("finds a breached password, sending only the first 5 characters of its hash", async () => {
    answerWith(`0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n${SUFFIX}:52256179`);

    expect(await isPwnedPassword("password")).toBe(true);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.pwnedpasswords.com/range/${PREFIX}`,
      expect.anything(),
    );
  });

  it("ignores padding lines", async () => {
    answerWith(`${SUFFIX}:0`);

    expect(await isPwnedPassword("password")).toBe(false);
  });

  it("lets the password through when the check is down", async () => {
    answerWith("", false);
    expect(await isPwnedPassword("password")).toBe(false);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new Error("offline"))),
    );
    expect(await isPwnedPassword("password")).toBe(false);
  });
});
