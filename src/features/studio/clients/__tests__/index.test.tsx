import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../../test/render-with-store";
import { getClientRow } from "../../../../test/studio-booking-row";
import { getStudioSeed } from "../../../../test/studio-seed";
import { StudioPage } from "../..";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../../test/setup-user";

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

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

const openTab = async (label: string, seed = getStudioSeed()) => {
  renderWithStore(<StudioPage seed={seed} />, "/studio");
  runNextTimer();
  await user.click(within(getLabelled("Sidebar")).getByTitle(label));

  return getLabelled(label);
};

describe("Studio → Clients", () => {
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

  it("desk screens list clients in a table, sorted by next booking", async () => {
    const clients = await openTab("Clients");

    expect(
      within(clients).getByText("Upcoming appointments"),
    ).toBeInTheDocument();

    const names = within(clients)
      .getAllByRole("button")
      .map(({ textContent }) => textContent)
      .filter((text) => /Okafor|Mensah|Adeyemi/.test(text || ""));

    expect(names[0]).toMatch(/Nia Okafor/);
    expect(within(clients).getAllByText("Blocked").length).toBeGreaterThan(0);
  });

  it("sorts by last visit across the new year", async () => {
    const seed = getStudioSeed();

    seed.bookings.clients = [
      getClientRow({ last_visit: "2026-12-20T10:00:00+00:00" }),
      getClientRow({
        id: "client-kemi",
        first: "Kemi",
        last: "Adeyemi",
        last_visit: "2027-01-05T10:00:00+00:00",
      }),
    ];

    const clients = await openTab("Clients", seed);

    await user.selectOptions(
      within(clients).getByRole("combobox", { name: "Sort clients" }),
      "last",
    );

    const names = within(clients)
      .getAllByRole("button")
      .map(({ textContent }) => textContent)
      .filter((text) => /Okafor|Adeyemi/.test(text || ""));

    expect(names[0]).toMatch(/Kemi Adeyemi/);
  });

  it("searches by phone digits and filters blocked clients", async () => {
    const clients = await openTab("Clients");

    await user.type(
      screen.getByLabelText("Search clients by name, phone or email"),
      "07700 900655",
    );

    expect(within(clients).getByText("Kemi Adeyemi")).toBeInTheDocument();
    expect(within(clients).queryByText("Nia Okafor")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    await user.click(within(clients).getByRole("button", { name: /^Blocked/ }));
    expect(within(clients).getByText("Kemi Adeyemi")).toBeInTheDocument();
    expect(within(clients).queryByText("Nia Okafor")).not.toBeInTheDocument();
  });

  it("an empty search offers to clear it", async () => {
    const clients = await openTab("Clients");

    await user.type(
      screen.getByLabelText("Search clients by name, phone or email"),
      "zzz",
    );

    expect(within(clients).getByText("No clients match")).toBeInTheDocument();

    await user.click(
      within(clients)
        .getAllByRole("button", { name: "Clear search" })
        .at(-1) as HTMLElement,
    );

    expect(within(clients).getByText("Nia Okafor")).toBeInTheDocument();
  });
});
