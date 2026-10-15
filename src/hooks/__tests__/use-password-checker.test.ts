import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { checkPassword, isPasswordCheckerReady } from "../../utils/password";
import { usePasswordChecker } from "../use-password-checker";

describe("usePasswordChecker", () => {
  it("doesn't load zxcvbn until a password is typed, then re-renders when ready", async () => {
    let renders = 0;

    renderHook(() => {
      renders++;
      usePasswordChecker();
    });

    checkPassword("");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(isPasswordCheckerReady()).toBe(false);

    checkPassword("a");

    await waitFor(() => expect(isPasswordCheckerReady()).toBe(true));
    await waitFor(() => expect(renders).toBeGreaterThan(1));
  });
});
