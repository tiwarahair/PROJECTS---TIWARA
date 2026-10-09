import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { isPasswordCheckerReady } from "../utils/password";
import { usePasswordChecker } from "./use-password-checker";

describe("usePasswordChecker", () => {
  it("loads zxcvbn and re-renders when ready", async () => {
    let renders = 0;
    renderHook(() => {
      renders++;
      usePasswordChecker();
    });
    await waitFor(() => expect(isPasswordCheckerReady()).toBe(true));
    await waitFor(() => expect(renders).toBeGreaterThan(1));
  });

  it("re-renders even when the checker was already loaded", async () => {
    let renders = 0;
    renderHook(() => {
      renders++;
      usePasswordChecker();
    });
    await waitFor(() => expect(renders).toBeGreaterThan(1));
  });
});
