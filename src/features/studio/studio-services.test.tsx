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

const renderServices = (fixture = "svc-cats") => {
  renderWithStore(<StudioPage />, `/studio?fixture=${fixture}`);
  runNextTimer();

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

  it("groups services by category, with archived ones last", () => {
    const services = renderServices();
    const text = services.textContent || "";

    const order = [
      "Signature braids",
      "Locs",
      "Natural & silk press",
      "Other services",
      "Archived",
    ].map((name) => text.lastIndexOf(name));

    expect(order).toEqual([...order].sort((first, second) => first - second));
    expect(within(services).getByText("Knotless braids")).toBeInTheDocument();
    expect(within(services).getByText("+15m")).toBeInTheDocument();
    expect(within(services).getByText("Restore")).toBeInTheDocument();
  });

  it("filters by category chip, search and status", () => {
    const services = renderServices();

    fireEvent.click(within(services).getByRole("button", { name: /^Locs/ }));

    expect(
      within(services).queryByText("Knotless braids"),
    ).not.toBeInTheDocument();

    expect(within(services).getByText("Loc retwist")).toBeInTheDocument();

    fireEvent.click(
      within(services).getByRole("button", { name: /^All categories/ }),
    );

    fireEvent.change(screen.getByPlaceholderText("Search services"), {
      target: { value: "zzz" },
    });

    expect(within(services).getByText("Nothing matches")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

    // the header's status button is hidden below 640px; the chip row has its own
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "Filter by status",
      })[1] as HTMLElement,
    );

    fireEvent.click(
      screen.getAllByRole("button", { name: "Archived" }).at(-1) as HTMLElement,
    );

    expect(within(services).getByText("Wash and go")).toBeInTheDocument();

    expect(
      within(services).queryByText("Knotless braids"),
    ).not.toBeInTheDocument();
  });

  it("the add-ons tab lists add-ons by category", () => {
    const services = renderServices();

    fireEvent.click(within(services).getByRole("button", { name: "Add-ons" }));
    expect(within(services).getByText("Beads")).toBeInTheDocument();
    expect(within(services).getAllByText("+£10, 30m")).toHaveLength(2);
    expect(screen.getByPlaceholderText("Search add-ons")).toBeInTheDocument();
  });

  it("the service menu archives and restores with a toast", () => {
    const services = renderServices();

    fireEvent.click(
      within(services).getAllByRole("button", {
        name: "Service options",
      })[0] as HTMLElement,
    );

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByText("Knotless braids archived")).toBeInTheDocument();

    fireEvent.click(
      within(getLabelled("Services")).getAllByText("Restore")[0] as HTMLElement,
    );

    expect(screen.getByText("Knotless braids restored")).toBeInTheDocument();
  });

  it("drafts ask the stylist to finish setting them up", () => {
    const services = renderServices("services-drafts");

    expect(within(services).getAllByText("Draft").length).toBeGreaterThan(0);

    expect(
      within(services).getAllByRole("button", { name: "Finish setting up" })
        .length,
    ).toBeGreaterThan(0);
  });

  it("desk screens show the category list beside the services", () => {
    setViewport(1440);
    renderServices();
    const categories = getLabelled("Categories");

    expect(
      within(categories).getByRole("button", { name: /All services/ }),
    ).toHaveTextContent("9");

    expect(
      within(categories).getByRole("button", { name: "Manage categories" }),
    ).toBeInTheDocument();
  });
});
