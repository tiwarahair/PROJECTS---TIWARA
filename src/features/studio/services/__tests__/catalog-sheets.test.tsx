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

const openServices = async () => {
  renderWithStore(<StudioPage />, "/studio");
  runNextTimer();
  await user.click(within(getLabelled("Sidebar")).getByTitle("Services"));
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

  it("adds a category and rejects an empty name", async () => {
    await openServices();

    await user.click(
      screen.getAllByRole("button", {
        name: "Manage categories",
      })[0] as HTMLElement,
    );

    const sheet = getLabelled("Manage categories");

    await user.click(
      within(sheet).getByRole("button", { name: "Add category" }),
    );

    expect(within(sheet).getByRole("alert")).toBeInTheDocument();

    await user.type(within(sheet).getByPlaceholderText("e.g. Kids"), "Kids");

    await user.click(
      within(sheet).getByRole("button", { name: "Add category" }),
    );

    expect(screen.getByText("Kids added")).toBeInTheDocument();

    expect(
      within(sheet).getByRole("button", { name: "Delete Kids" }),
    ).toBeInTheDocument();
  });

  it("renames a category", async () => {
    await openServices();

    await user.click(
      screen.getAllByRole("button", {
        name: "Manage categories",
      })[0] as HTMLElement,
    );

    const sheet = getLabelled("Manage categories");

    await user.click(
      within(sheet).getAllByRole("button", { name: "Edit" })[0] as HTMLElement,
    );

    const name = within(sheet).getByDisplayValue("Signature braids");

    await user.clear(name);
    await user.type(name, "Braids");

    await user.click(within(sheet).getByRole("button", { name: "Save" }));
    expect(screen.getByText("Category saved")).toBeInTheDocument();
    expect(within(sheet).getByText("Braids")).toBeInTheDocument();
  });

  it("an add-on needs a name before it can be created", async () => {
    await openServices();
    await user.click(screen.getByRole("button", { name: "Add-ons" }));
    await user.click(screen.getByRole("button", { name: "Add add-on" }));
    const create = screen.getByRole("button", { name: "Create add-on" });

    await user.click(create);

    expect(
      await screen.findByText("Enter a name for the add-on."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Add add-on" }));

    expect(
      screen.queryByText("Enter a name for the add-on."),
    ).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("e.g. Beads"), "Cuffs");
    await user.click(screen.getByRole("button", { name: "Create add-on" }));

    expect(
      await screen.findByText("Cuffs added to your add-ons"),
    ).toBeInTheDocument();
  });
});
