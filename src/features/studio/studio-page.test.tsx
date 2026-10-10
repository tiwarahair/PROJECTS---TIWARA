import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../test/render-with-store";
import { GATE_REASON } from "./studio-data";
import { StudioPage } from "./studio-page";

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const getLabelled = (label: string) =>
  document.querySelector('[data-screen-label="' + label + '"]');

/** Matches min-width queries up to `width`, like a real viewport. */
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

// one timer per act, so React renders between them as the browser would
const runNextTimer = () => act(() => void vi.advanceTimersToNextTimer());
const renderStudio = (query = "") => {
  const result = renderWithStore(<StudioPage />, "/studio" + query);
  runNextTimer();
  return result;
};

describe("StudioPage", () => {
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

  it("renders without crashing: narrow Home with the footer nav and setup banner", () => {
    renderStudio();
    expect(screen.getByText("Morning, Amara")).toBeInTheDocument();
    const nav = document.querySelectorAll("nav")[0] as HTMLElement;
    expect(
      within(nav)
        .getAllByRole("button")
        .map(({ textContent }) => textContent),
    ).toEqual(["Home", "Bookings", "Services", "Earnings", "More"]);
    expect(screen.getByText("Set up your studio")).toBeInTheDocument();
    expect(getLabelled("Go-live banner")).toHaveTextContent(
      "Finish setup to go live",
    );
    expect(
      screen.getByRole("button", { name: "New booking" }),
    ).toBeInTheDocument();
  });

  it("wide screens show the sidebar and the setup checklist, which minimises to a pill", () => {
    setViewport(1440);
    renderStudio();
    const sidebar = getLabelled("Sidebar") as HTMLElement;
    expect(within(sidebar).getByTitle("Clients")).toBeInTheDocument();
    expect(within(sidebar).getByTitle("Settings")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Set up your studio" }),
    ).toHaveTextContent("1 of 4 done");
    fireEvent.click(screen.getByRole("button", { name: "Minimise checklist" }));
    expect(
      screen.queryByRole("region", { name: "Set up your studio" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Open setup checklist" }),
    );
    expect(
      screen.getByRole("region", { name: "Set up your studio" }),
    ).toBeInTheDocument();
  });

  it("the overview range switches the stats and the chart caption", () => {
    renderStudio();
    expect(screen.getByText("Last 7 days")).toBeInTheDocument();
    expect(screen.getByText("£1,120")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByText("Today, by hour")).toBeInTheDocument();
    expect(screen.getByText("£240")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Today's appointments" }),
    ).toBeInTheDocument();
  });

  it("lists today's bookings and those due for checkout", () => {
    renderStudio();
    const today = getLabelled("Today") as HTMLElement;
    expect(within(today).getByText("Nia Okafor")).toBeInTheDocument();
    expect(within(today).getByText("Ruth Mensah")).toBeInTheDocument();
    expect(getLabelled("Due for checkout")).toHaveTextContent("Kemi Adeyemi");
    expect(getLabelled("Today hero")).toHaveTextContent("2 appointments");
  });

  it("a new account starts empty, and the gate stops the booking link", () => {
    renderStudio("?account=new");
    expect(screen.getByText("No appointments yet")).toBeInTheDocument();
    expect(screen.getByText("Nothing to chart yet")).toBeInTheDocument();
    expect(getLabelled("Today hero")).toHaveTextContent("Nothing booked");
    fireEvent.click(screen.getByRole("button", { name: "Copy booking link" }));
    expect(screen.getByText(GATE_REASON)).toBeInTheDocument();
    advance(2600);
    expect(screen.queryByText(GATE_REASON)).not.toBeInTheDocument();
  });

  it("finishing setup celebrates with the booking link, then nudges for a policy", () => {
    renderStudio("?fixture=all-done");
    runNextTimer();
    const card = getLabelled("Booking link ready") as HTMLElement;
    expect(card).toHaveTextContent("Your booking link is ready to share");
    expect(
      within(card).getByRole("link", { name: "Preview profile" }),
    ).toHaveAttribute("href", "/stylist?stylist=amara-beauty");
    fireEvent.click(within(card).getByRole("button", { name: "Copy link" }));
    expect(screen.getByText("Booking link copied")).toBeInTheDocument();
    expect(getLabelled("Policy nudge")).toHaveTextContent(
      "Make your policy your own",
    );
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(getLabelled("Policy nudge")).not.toBeInTheDocument();
  });

  it("a welcome note from onboarding greets the stylist once", () => {
    localStorage.setItem(
      "tw_welcome",
      JSON.stringify({ at: Date.now(), first: "Amara" }),
    );
    renderStudio();
    advance(600);
    expect(
      screen.getByText("Welcome, Amara. Let’s get you ready to take bookings."),
    ).toBeInTheDocument();
    expect(localStorage.getItem("tw_welcome")).toBeNull();
  });
});
