import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { useLinkPage } from "../use-link-page";

describe("useLinkPage", () => {
  it("reads the link's token and shows the page on the manage backdrop until it closes", () => {
    window.history.replaceState(null, "", "/pay?token=abc");

    const { result, unmount } = renderHook(() => useLinkPage("tw_test_token"), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <MemoryRouter initialEntries={["/pay?token=abc"]}>
          {children}
        </MemoryRouter>
      ),
    });

    expect(result.current).toBe("abc");
    expect(document.documentElement).toHaveClass("manage-page");

    unmount();

    expect(document.documentElement).not.toHaveClass("manage-page");
  });
});
