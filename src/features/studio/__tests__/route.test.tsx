import { act, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { sessionChanged } from "../../../stores/session-slice";
import { renderWithStore } from "../../../test/render-with-store";
import { StudioRoute } from "../route";

describe("StudioRoute", () => {
  it("sends signed-out visitors to the stylist log in", () => {
    const { store } = renderWithStore(<StudioRoute />, "/studio");

    act(() => {
      store.dispatch(sessionChanged(null));
    });

    expect(screen.getByTestId("location")).toHaveTextContent("/login?flow=pro");
  });

  it("sends signed-in customers to the stylist landing", () => {
    renderWithStore(<StudioRoute />, "/studio", { signedIn: true });

    expect(screen.getByTestId("location")).toHaveTextContent("/join");
  });

  it("shows a loading skeleton, not a blank page, while the session loads", async () => {
    vi.useFakeTimers();
    renderWithStore(<StudioRoute />, "/studio");

    await act(() => vi.advanceTimersByTimeAsync(400));

    expect(screen.getByTestId("studio-skeleton")).toBeInTheDocument();
    vi.useRealTimers();
  });
});
