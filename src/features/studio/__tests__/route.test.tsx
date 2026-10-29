import { act, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { supabase } from "../../../lib/supabase";
import { sessionChanged } from "../../../stores/session-slice";
import { renderWithStore, TEST_USER } from "../../../test/render-with-store";
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

  it("sends a stylist who hasn't entered their code back to the code step", async () => {
    vi.spyOn(supabase, "rpc").mockResolvedValue({
      data: false,
      error: null,
    } as never);

    const { store } = renderWithStore(<StudioRoute />, "/studio");

    act(() => {
      store.dispatch(sessionChanged({ ...TEST_USER, isStylist: true }));
    });

    await vi.waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/login?screen=pro-2fa",
      ),
    );

    expect(supabase.rpc).toHaveBeenCalledWith("passed_second_factor");
  });

  it("shows a loading skeleton, not a blank page, while the session loads", async () => {
    vi.useFakeTimers();
    renderWithStore(<StudioRoute />, "/studio");

    await act(() => vi.advanceTimersByTimeAsync(400));

    expect(screen.getByTestId("studio-skeleton")).toBeInTheDocument();
    vi.useRealTimers();
  });
});
