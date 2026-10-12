import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../test/render-with-store";
import { StudioPage } from "./studio-page";

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

const openServices = () => {
  renderWithStore(<StudioPage />, "/studio");
  runNextTimer();
  fireEvent.click(within(getLabelled("Sidebar")).getByTitle("Services"));
};

describe("Studio → categories and add-on sheets", () => {
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

  it("adds a category and rejects an empty name", () => {
    openServices();

    fireEvent.click(
      screen.getAllByRole("button", {
        name: "Manage categories",
      })[0] as HTMLElement,
    );

    const sheet = getLabelled("Manage categories");

    fireEvent.click(
      within(sheet).getByRole("button", { name: "Add category" }),
    );

    expect(within(sheet).getByRole("alert")).toBeInTheDocument();

    fireEvent.change(within(sheet).getByPlaceholderText("e.g. Kids"), {
      target: { value: "Kids" },
    });

    fireEvent.click(
      within(sheet).getByRole("button", { name: "Add category" }),
    );

    expect(screen.getByText("Kids added")).toBeInTheDocument();

    expect(
      within(sheet).getByRole("button", { name: "Delete Kids" }),
    ).toBeInTheDocument();
  });

  it("renames a category", () => {
    openServices();

    fireEvent.click(
      screen.getAllByRole("button", {
        name: "Manage categories",
      })[0] as HTMLElement,
    );

    const sheet = getLabelled("Manage categories");

    fireEvent.click(
      within(sheet).getAllByRole("button", { name: "Edit" })[0] as HTMLElement,
    );

    fireEvent.change(within(sheet).getByDisplayValue("Signature braids"), {
      target: { value: "Braids" },
    });

    fireEvent.click(within(sheet).getByRole("button", { name: "Save" }));
    expect(screen.getByText("Category saved")).toBeInTheDocument();
    expect(within(sheet).getByText("Braids")).toBeInTheDocument();
  });

  it("an add-on needs a name before it can be created", () => {
    openServices();
    fireEvent.click(screen.getByRole("button", { name: "Add-ons" }));
    fireEvent.click(screen.getByRole("button", { name: "Add add-on" }));
    const create = screen.getByRole("button", { name: "Create add-on" });

    expect(create).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("e.g. Beads"), {
      target: { value: "Cuffs" },
    });

    expect(create).toBeEnabled();
    fireEvent.click(create);
    expect(screen.getByText("Cuffs added to your add-ons")).toBeInTheDocument();
  });
});
