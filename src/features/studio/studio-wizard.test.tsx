import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../test/render-with-store";
import { StudioPage } from "./studio-page";

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

const openWizard = () => {
  renderWithStore(<StudioPage />, "/studio");
  runNextTimer();
  fireEvent.click(within(getLabelled("Sidebar")).getByTitle("Services"));
  fireEvent.click(screen.getByRole("button", { name: "Add service" }));
  advance(300);
};

const pickSuggestion = (name: string) => {
  fireEvent.click(screen.getByRole("button", { name: "Suggested services" }));

  fireEvent.click(
    within(getLabelled("Suggested services")).getByRole("button", { name }),
  );

  advance(1200);
};

const getContinue = () => screen.getByRole("button", { name: "Continue" });

describe("Studio → service wizard", () => {
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

  it("needs a name and service type before Continue", () => {
    openWizard();
    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(getContinue()).toBeDisabled();
  });

  it("a suggestion fills the form and the wizard adds the service", () => {
    openWizard();
    pickSuggestion("Knotless braids");
    expect(screen.getByDisplayValue("Knotless braids")).toBeInTheDocument();
    fireEvent.click(getContinue());
    expect(screen.getByText("Pricing")).toBeInTheDocument();
    expect(screen.getByText("Add size options")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Review your prices" }));
    expect(screen.getByText("Review prices")).toBeInTheDocument();
    fireEvent.click(getContinue());
    expect(screen.getByText("Added to this service")).toBeInTheDocument();

    // the Services header has its own "Add service" button; the footer's comes last
    fireEvent.click(
      screen
        .getAllByRole("button", { name: "Add service" })
        .at(-1) as HTMLElement,
    );

    expect(
      screen.getByText("Knotless braids added to your services"),
    ).toBeInTheDocument();
  });

  it("a customisation needs a name and two options", () => {
    openWizard();
    pickSuggestion("Knotless braids");
    fireEvent.click(getContinue());

    fireEvent.click(
      screen.getByRole("button", { name: "Add a customisation" }),
    );

    const dialog = getLabelled("Customisation dialog");

    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Add a name, like Parting",
    );

    fireEvent.change(within(dialog).getByPlaceholderText("e.g. Parting"), {
      target: { value: "Parting" },
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Add at least 2 options",
    );

    const [first, second] = within(dialog).getAllByLabelText("Option name");

    fireEvent.change(first as HTMLElement, { target: { value: "Middle" } });
    fireEvent.change(second as HTMLElement, { target: { value: "Side" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(screen.getByText("Parting")).toBeInTheDocument();
  });
});
