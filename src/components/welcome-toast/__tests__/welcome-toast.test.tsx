import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { MemoryRouter } from "react-router";
import { queueSiteToast, WelcomeToast } from "../welcome-toast";

const renderAt = (url = "/") =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <WelcomeToast />
    </MemoryRouter>,
  );

describe("WelcomeToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });

  afterEach(() => vi.useRealTimers());

  it("shows the stored welcome once, 600ms after load, then hides after 4s", async () => {
    sessionStorage.setItem("tw_toast", "Welcome back, Nia");
    renderAt();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(600));
    expect(sessionStorage.getItem("tw_toast")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Welcome back, Nia");
    await act(async () => vi.advanceTimersByTime(4000));
    await act(async () => vi.advanceTimersByTime(260));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows a message queued while the page is already open (logging out on Home)", async () => {
    renderAt();
    act(() => queueSiteToast("Signed out. See you soon."));
    await act(async () => vi.advanceTimersByTime(600));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Signed out. See you soon.",
    );

    expect(sessionStorage.getItem("tw_toast")).toBeNull();
  });

  it("pins the ?twtoast= message for boards", async () => {
    renderAt("/?twtoast=Welcome%20to%20Tiw%C3%A1ra%27s%20House%2C%20Nia");
    await act(async () => vi.advanceTimersByTime(10000));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Welcome to Tiwára's House, Nia",
    );
  });

  it("shows the stored welcome under StrictMode too", async () => {
    sessionStorage.setItem("tw_toast", "Welcome back, Nia");

    render(
      <StrictMode>
        <MemoryRouter>
          <WelcomeToast />
        </MemoryRouter>
      </StrictMode>,
    );

    await act(async () => vi.advanceTimersByTime(600));
    expect(screen.getByRole("status")).toHaveTextContent("Welcome back, Nia");
  });

  it("renders nothing without a message", () => {
    renderAt();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
