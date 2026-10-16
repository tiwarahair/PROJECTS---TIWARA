import { act, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../../../test/render-with-store";
import { StudioPage } from "../../..";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../../../test/setup-user";

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

const openWizard = async () => {
  renderWithStore(<StudioPage />, "/studio");
  runNextTimer();
  await user.click(within(getLabelled("Sidebar")).getByTitle("Services"));
  await user.click(screen.getByRole("button", { name: "Add service" }));
  advance(300);
};

const pickSuggestion = async (name: string) => {
  await user.click(screen.getByRole("button", { name: "Suggested services" }));

  await user.click(
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

  it("needs a name and service type before Continue", async () => {
    await openWizard();
    expect(screen.getByText("Details")).toBeInTheDocument();
    await user.click(getContinue());

    expect(await screen.findByText("Name this service.")).toBeInTheDocument();
    expect(screen.getByText("Choose the service type.")).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText("e.g. Knotless braids"),
      "Cornrows",
    );

    await waitFor(() =>
      expect(screen.queryByText("Name this service.")).not.toBeInTheDocument(),
    );

    expect(screen.getByText("Choose the service type.")).toBeInTheDocument();
  });

  it("a suggestion fills the form and the wizard adds the service", async () => {
    await openWizard();
    await pickSuggestion("Knotless braids");
    expect(screen.getByDisplayValue("Knotless braids")).toBeInTheDocument();
    await user.click(getContinue());
    expect(await screen.findByText("Pricing")).toBeInTheDocument();
    expect(screen.getByText("Add size options")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Review your prices" }),
    );

    expect(screen.getByText("Review prices")).toBeInTheDocument();
    await user.click(getContinue());

    expect(
      await screen.findByText("Added to this service"),
    ).toBeInTheDocument();

    // the Services header has its own "Add service" button; the footer's comes last
    await user.click(
      screen
        .getAllByRole("button", { name: "Add service" })
        .at(-1) as HTMLElement,
    );

    expect(
      await screen.findByText("Knotless braids added to your services"),
    ).toBeInTheDocument();
  });

  it("editing jumps to the tab with a missing price on save", async () => {
    renderWithStore(<StudioPage />, "/studio");
    runNextTimer();
    await user.click(within(getLabelled("Sidebar")).getByTitle("Services"));
    await user.click(screen.getAllByText("Knotless braids")[0] as HTMLElement);
    advance(300);
    await user.click(screen.getByRole("button", { name: "Pricing" }));
    await user.clear(screen.getAllByLabelText("Base price")[0] as HTMLElement);

    await user.click(
      screen.getAllByRole("button", { name: "Add-ons" }).at(-1) as HTMLElement,
    );

    await user.click(screen.getByRole("button", { name: "Save service" }));

    expect(await screen.findByText("Enter a price.")).toBeInTheDocument();
  });

  it("a customisation needs a name and two options", async () => {
    await openWizard();
    await pickSuggestion("Knotless braids");
    await user.click(getContinue());

    await user.click(
      await screen.findByRole("button", { name: "Add a customisation" }),
    );

    const dialog = getLabelled("Customisation dialog");

    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Add a name, like Parting",
    );

    await user.type(
      within(dialog).getByPlaceholderText("e.g. Parting"),
      "Parting",
    );

    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Add at least 2 options",
    );

    const [first, second] = within(dialog).getAllByLabelText("Option name");

    await user.type(first as HTMLElement, "Middle");
    await user.type(second as HTMLElement, "Side");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(screen.getByText("Parting")).toBeInTheDocument();
  });
});
