import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../test/render-with-store";
import { StudioPage } from "./studio-page";

const getDialog = () =>
  document.querySelector(
    '[data-screen-label="Two-step verification"]',
  ) as HTMLElement;
const runNextTimer = () => act(() => void vi.advanceTimersToNextTimer());

const setViewport = (width: number) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const minWidth = /min-width:\s*(\d+)px/.exec(query);
    return {
      matches: minWidth ? width >= Number(minWidth[1]) : false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  });
};

const renderFixture = (fixture: string) => {
  renderWithStore(<StudioPage />, "/studio?fixture=" + fixture);
  runNextTimer();
};

describe("Studio → two-step verification", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "Date",
      ],
    });
    vi.setSystemTime(new Date(2026, 8, 7, 9, 0));
    localStorage.clear();
    setViewport(1440);
  });
  afterEach(() => vi.useRealTimers());

  it("tax details and Stripe stay locked until 2FA is on", () => {
    renderFixture("secure-locked");
    const dialog = getDialog();
    expect(
      within(dialog).getByText("Get paid: 2FA, tax details and Stripe"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Turn on" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: "Add" }),
    ).not.toBeInTheDocument();
  });

  it("a wrong code is rejected and the right one moves on to a backup", () => {
    renderFixture("tf-app");
    const dialog = getDialog();
    fireEvent.change(within(dialog).getByLabelText("6-digit code"), {
      target: { value: "111111" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Turn on" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "That code isn’t right",
    );
    fireEvent.change(within(dialog).getByLabelText("6-digit code"), {
      target: { value: "123456" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Turn on" }));
    expect(within(getDialog()).getByText("Add a backup")).toBeInTheDocument();
  });

  it("skipping the backup warns once, then finishes", () => {
    renderFixture("tf-backup");
    const dialog = getDialog();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Skip for now" }),
    );
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Without a backup",
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Skip for now" }),
    );
    expect(
      within(getDialog()).getByText("Two‑step verification is on"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Close" }).length,
    ).toBeGreaterThan(0);
  });
});
