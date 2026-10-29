import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../../test/render-with-store";
import { getStudioRow, getStudioSeed } from "../../../../test/studio-seed";
import { StudioPage } from "../..";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../../test/setup-user";

// saves stay in flight, so the screen keeps what was done
vi.mock("../../../../lib/studio-api/services", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../../lib/studio-api/services")
  >()),
  saveService: vi.fn(() => new Promise(() => {})),
}));

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

// the silk press, an archived wash and go with no category, and a draft blow-dry
const getCatalogueSeed = () => {
  const studio = getStudioRow();
  const [silkPress] = studio.services;

  if (!silkPress) throw new Error("the studio row has a service");

  studio.services = [
    silkPress,
    {
      ...silkPress,
      id: "s-2",
      name: "Wash and go",
      category_id: null,
      status: "archived",
      sort: 1,
    },
    { ...silkPress, id: "s-3", name: "Blow-dry", status: "draft", sort: 2 },
  ];

  return getStudioSeed({ studio });
};

const renderServices = async () => {
  renderWithStore(<StudioPage seed={getCatalogueSeed()} />, "/studio");
  runNextTimer();
  await user.click(screen.getAllByRole("button", { name: "Services" })[0]!);

  return getLabelled("Services");
};

describe("Studio → Services", () => {
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
    setViewport(390);
  });

  afterEach(() => vi.useRealTimers());

  it("groups services by category, with archived ones last", async () => {
    const services = await renderServices();
    const text = services.textContent || "";

    const order = ["Natural hair", "Archived"].map((name) =>
      text.lastIndexOf(name),
    );

    expect(order).toEqual([...order].sort((first, second) => first - second));
    expect(within(services).getByText("Silk press")).toBeInTheDocument();
    expect(within(services).getByText("Restore")).toBeInTheDocument();
  });

  it("filters by search and status", async () => {
    const services = await renderServices();

    await user.type(screen.getByPlaceholderText("Search services"), "zzz");

    expect(within(services).getByText("Nothing matches")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear search" }));

    // the header's status button is hidden below 640px; the chip row has its own
    await user.click(
      screen.getAllByRole("button", {
        name: "Filter by status",
      })[1] as HTMLElement,
    );

    await user.click(
      screen.getAllByRole("button", { name: "Archived" }).at(-1) as HTMLElement,
    );

    expect(within(services).getByText("Wash and go")).toBeInTheDocument();
    expect(within(services).queryByText("Silk press")).not.toBeInTheDocument();
  });

  it("the add-ons tab lists add-ons by category", async () => {
    const services = await renderServices();

    await user.click(within(services).getByRole("button", { name: "Add-ons" }));
    expect(within(services).getByText("Trim")).toBeInTheDocument();
    expect(within(services).getByText("+£10, 15m")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search add-ons")).toBeInTheDocument();
  });

  it("the service menu archives and restores with a toast", async () => {
    const services = await renderServices();

    await user.click(
      within(services).getAllByRole("button", {
        name: "Service options",
      })[0] as HTMLElement,
    );

    await user.click(screen.getByRole("menuitem", { name: "Archive" }));
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByText("Silk press archived")).toBeInTheDocument();

    await user.click(
      within(getLabelled("Services")).getAllByText("Restore")[0] as HTMLElement,
    );

    expect(screen.getByText(/restored$/)).toBeInTheDocument();
  });

  it("drafts ask the stylist to finish setting them up", async () => {
    const services = await renderServices();

    expect(within(services).getAllByText("Draft").length).toBeGreaterThan(0);

    expect(
      within(services).getAllByRole("button", { name: "Finish setting up" })
        .length,
    ).toBeGreaterThan(0);
  });

  it("desk screens show the category list beside the services", async () => {
    setViewport(1440);
    await renderServices();
    const categories = getLabelled("Categories");

    expect(
      within(categories).getByRole("button", { name: /All services/ }),
    ).toHaveTextContent("3");

    expect(
      within(categories).getByRole("button", { name: "Manage categories" }),
    ).toBeInTheDocument();
  });
});
