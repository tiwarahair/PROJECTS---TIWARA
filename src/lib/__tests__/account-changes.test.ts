import { afterEach, describe, expect, it, vi } from "vitest";
import { changePassword } from "../account-changes";
import { FunctionError, invokeFunction } from "../invoke-function";
import { supabase } from "../supabase";

vi.mock("../invoke-function", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../invoke-function")>()),
  invokeFunction: vi.fn(),
}));

vi.mock("../supabase", () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(async () => ({ error: null })),
      signOut: vi.fn(async () => ({ error: null })),
    },
  },
}));

const { updateUser, signOut } = supabase.auth;

describe("changePassword", () => {
  afterEach(() => vi.clearAllMocks());

  it("checks the password on the server, then saves it with Supabase and the emailed code", async () => {
    vi.mocked(invokeFunction).mockResolvedValue({ problem: "" });

    expect(await changePassword("copper meadow 47", "482913", true)).toBeNull();

    expect(invokeFunction).toHaveBeenCalledWith(
      "check-password",
      expect.objectContaining({ password: "copper meadow 47" }),
    );

    expect(updateUser).toHaveBeenCalledWith({
      password: "copper meadow 47",
      nonce: "482913",
    });

    expect(signOut).toHaveBeenCalledWith({ scope: "others" });
  });

  it("doesn't save a password that was in a breach", async () => {
    vi.mocked(invokeFunction).mockResolvedValue({ problem: "pwned" });

    expect(await changePassword("copper meadow 47", "", false)).toBe(
      "pwned_password",
    );

    expect(updateUser).not.toHaveBeenCalled();
  });

  it("still saves when the check can't run, as the browser has checked it", async () => {
    vi.mocked(invokeFunction).mockRejectedValue(new FunctionError("unknown"));

    expect(await changePassword("copper meadow 47", "", false)).toBeNull();
    expect(updateUser).toHaveBeenCalled();
  });
});
