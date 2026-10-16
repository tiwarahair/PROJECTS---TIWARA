import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../../test/render-with-store";
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
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

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

const openClients = async () => {
  renderWithStore(<StudioPage />, "/studio");
  runNextTimer();
  await user.click(within(getLabelled("Sidebar")).getByTitle("Clients"));

  return getLabelled("Clients");
};

describe("Studio → client sheets", () => {
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

  it("wide screens open a client's profile in the side panel", async () => {
    const clients = await openClients();

    await user.click(within(clients).getByText("Nia Okafor"));

    expect(
      screen.getByRole("heading", { name: "Nia Okafor" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Book Nia" }),
    ).toBeInTheDocument();
  });

  it("adding a client needs a first name and a phone or email", async () => {
    const clients = await openClients();

    await user.click(
      within(clients).getByRole("button", { name: "Add client" }),
    );

    const save = screen
      .getAllByRole("button", { name: "Add client" })
      .at(-1) as HTMLElement;

    expect(save).toBeDisabled();

    await user.type(
      screen.getByPlaceholderText("07700 900000"),
      "07700 900123",
    );

    await user.type(screen.getByLabelText("First name"), "Ada");

    expect(save).toBeEnabled();
    await user.click(save);
    advance(300);
    expect(screen.getByText("Ada added")).toBeInTheDocument();
  });

  it("a phone number already on file points to that client", async () => {
    const clients = await openClients();

    await user.click(
      within(clients).getByRole("button", { name: "Add client" }),
    );

    await user.type(
      screen.getByPlaceholderText("name@email.com"),
      "nia.okafor@gmail.com",
    );

    expect(
      screen.getByRole("button", { name: "View Nia" }),
    ).toBeInTheDocument();
  });
});
