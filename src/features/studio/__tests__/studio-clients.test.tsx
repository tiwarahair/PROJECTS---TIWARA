import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../test/render-with-store";
import { StudioPage } from "../studio-page";

const getLabelled = (label: string) =>
  document.querySelector(`[data-screen-label="${label}"]`) as HTMLElement;

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

const openTab = (label: string) => {
  renderWithStore(<StudioPage />, "/studio");
  runNextTimer();
  fireEvent.click(within(getLabelled("Sidebar")).getByTitle(label));

  return getLabelled(label);
};

describe("Studio → Clients and Earnings", () => {
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

  it("desk screens list clients in a table, sorted by next booking", () => {
    const clients = openTab("Clients");

    expect(
      within(clients).getByText("Upcoming appointments"),
    ).toBeInTheDocument();

    const names = within(clients)
      .getAllByRole("button")
      .map(({ textContent }) => textContent)
      .filter((text) => /Okafor|Mensah|Adeyemi/.test(text || ""));

    expect(names[0]).toMatch(/^Nia Okafor/);
    expect(within(clients).getAllByText("Blocked").length).toBeGreaterThan(0);
  });

  it("searches by phone digits and filters blocked clients", () => {
    const clients = openTab("Clients");

    fireEvent.change(
      screen.getByLabelText("Search clients by name, phone or email"),
      { target: { value: "07700 900655" } },
    );

    expect(within(clients).getByText("Kemi Adeyemi")).toBeInTheDocument();
    expect(within(clients).queryByText("Nia Okafor")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    fireEvent.click(within(clients).getByRole("button", { name: /^Blocked/ }));
    expect(within(clients).getByText("Tola Fashola")).toBeInTheDocument();
    expect(within(clients).queryByText("Kemi Adeyemi")).not.toBeInTheDocument();
  });

  it("an empty search offers to clear it", () => {
    const clients = openTab("Clients");

    fireEvent.change(
      screen.getByLabelText("Search clients by name, phone or email"),
      { target: { value: "zzz" } },
    );

    expect(within(clients).getByText("No clients match")).toBeInTheDocument();

    fireEvent.click(
      within(clients)
        .getAllByRole("button", { name: "Clear search" })
        .at(-1) as HTMLElement,
    );

    expect(within(clients).getByText("Nia Okafor")).toBeInTheDocument();
  });

  it("the Earnings tab embeds the earnings dashboard", () => {
    const earnings = openTab("Earnings");

    expect(within(earnings).getByText("Available")).toBeInTheDocument();
  });
});
