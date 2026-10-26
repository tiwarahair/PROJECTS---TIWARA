import { describe, expect, it, vi } from "vitest";
import { isPwnedPassword } from "../../_shared/pwned-password";
import { findPasswordProblem } from "../check";

vi.mock("../../_shared/pwned-password", () => ({ isPwnedPassword: vi.fn() }));

describe("findPasswordProblem", () => {
  it("uses our own rules first, without asking about breaches", async () => {
    expect(await findPasswordProblem("tiwara12", "pro", {})).toBe("site");
    expect(isPwnedPassword).not.toHaveBeenCalled();
  });

  it("then turns down a breached password", async () => {
    vi.mocked(isPwnedPassword).mockResolvedValue(true);

    expect(
      await findPasswordProblem("correct horse battery staple", "client", {}),
    ).toBe("pwned");
  });

  it("passes a password that's fine on both counts", async () => {
    vi.mocked(isPwnedPassword).mockResolvedValue(false);

    expect(await findPasswordProblem("copper meadow 47", "client", {})).toBe(
      "",
    );
  });
});
