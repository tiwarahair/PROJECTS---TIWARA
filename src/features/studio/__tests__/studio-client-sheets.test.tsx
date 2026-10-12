import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../test/render-with-store";
import { StudioPage } from "../studio-page";

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

const openClients = () => {
  renderWithStore(<StudioPage />, "/studio");
  runNextTimer();
  fireEvent.click(within(getLabelled("Sidebar")).getByTitle("Clients"));

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

  it("wide screens open a client's profile in the side panel", () => {
    const clients = openClients();

    fireEvent.click(within(clients).getByText("Nia Okafor"));

    expect(
      screen.getByRole("heading", { name: "Nia Okafor" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Book Nia" }),
    ).toBeInTheDocument();
  });

  it("adding a client needs a first name and a phone or email", () => {
    const clients = openClients();

    fireEvent.click(
      within(clients).getByRole("button", { name: "Add client" }),
    );

    const save = screen
      .getAllByRole("button", { name: "Add client" })
      .at(-1) as HTMLElement;

    expect(save).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("07700 900000"), {
      target: { value: "07700 900123" },
    });

    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Ada" },
    });

    expect(save).toBeEnabled();
    fireEvent.click(save);
    advance(300);
    expect(screen.getByText("Ada added")).toBeInTheDocument();
  });

  it("a phone number already on file points to that client", () => {
    const clients = openClients();

    fireEvent.click(
      within(clients).getByRole("button", { name: "Add client" }),
    );

    fireEvent.change(screen.getByPlaceholderText("name@email.com"), {
      target: { value: "nia.okafor@gmail.com" },
    });

    expect(
      screen.getByRole("button", { name: "View Nia" }),
    ).toBeInTheDocument();
  });
});
