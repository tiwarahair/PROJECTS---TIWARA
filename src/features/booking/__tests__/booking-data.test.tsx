import { renderHook, screen, waitFor } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BookingError,
  getAvailableSlots,
  holdBooking,
  isInTravelArea,
} from "../../../lib/booking-api";
import { fetchPublicProfile } from "../../../lib/public-profiles";
import { createStore } from "../../../stores/store";
import { getDemoProfile } from "../../../test/demo-profile";
import { renderBooking } from "../../../test/render-booking";
import { renderWithStore } from "../../../test/render-with-store";
import { setupUser } from "../../../test/setup-user";
import { EMPTY_ADDRESS } from "../booking-state";
import { BookingPage } from "../booking-route";
import { useTravelCheck } from "../use-travel-check";

vi.mock("../../../lib/public-profiles", async (original) =>
  (await import("../../../test/booking-mocks")).mockPublicProfiles(original),
);

vi.mock("../../../lib/booking-api", async (original) => ({
  ...(await (
    await import("../../../test/booking-mocks")
  ).mockBookingApi(original)),
  isInTravelArea: vi.fn(),
}));

// Silk press has nothing to customise, so the flow opens on Pick a time
const SILK = "stylist=tiwaras-house&service=tiwaras-house--silk-press";

// 20 October 2026 is BST: 10:00 and 10:30 in London
const OPEN_TIMES = ["2026-10-20T09:00:00Z", "2026-10-20T09:30:00Z"];

let user: UserEvent;

const pickTime = async (time: string) => {
  const day = await screen.findByRole("button", { name: "20" });

  await waitFor(() => expect(day).toBeEnabled());
  await user.click(day);
  await user.click(screen.getByRole("button", { name: time }));
};

const continueFromTime = () =>
  user.click(screen.getAllByRole("button", { name: /^Continue$/ })[0]!);

describe("booking on real data", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "Date",
      ],
      now: new Date("2026-10-14T09:00:00Z"),
    });

    user = setupUser();
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    vi.mocked(getAvailableSlots).mockResolvedValue(OPEN_TIMES);
  });

  afterEach(() => vi.useRealTimers());

  it("shows the stylist's real services and open days and times for the month", async () => {
    await renderBooking(SILK);

    expect(
      screen.getByRole("heading", { level: 1, name: "Pick a time" }),
    ).toBeInTheDocument();

    expect(getAvailableSlots).toHaveBeenCalledWith({
      serviceId: "tiwaras-house--silk-press",
      choices: { variations: [], addons: [] },
      from: "2026-10-01",
      to: "2026-10-31",
    });

    expect(await screen.findByRole("button", { name: "20" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "21" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "20" }));

    expect(screen.getByRole("button", { name: "10:00" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10:30" })).toBeInTheDocument();
  });

  it("leaving the time step holds it on the server, and the bar counts down to the server's expiry", async () => {
    vi.mocked(holdBooking).mockResolvedValueOnce({
      id: "hold-1",
      ref: "TH-TEST01",
      secret: "secret",
      starts_at: OPEN_TIMES[1]!,
      hold_expires_at: "2026-10-14T09:10:00Z",
    });

    await renderBooking(SILK);
    await pickTime("10:30");
    await continueFromTime();

    expect(holdBooking).toHaveBeenCalledWith({
      serviceId: "tiwaras-house--silk-press",
      choices: { variations: [], addons: [] },
      startsAt: OPEN_TIMES[1],
    });

    expect(
      await screen.findByRole("dialog", { name: "Have an account?" }),
    ).toBeInTheDocument();

    expect(screen.getAllByRole("timer", { hidden: true })[0]).toHaveAttribute(
      "aria-label",
      expect.stringMatching(/^Holding 10:30 for you, (9|10) minutes/),
    );
  });

  it("a time someone else just took says so, clears the time and fetches fresh times", async () => {
    vi.mocked(holdBooking).mockRejectedValueOnce(
      new BookingError("slot_taken"),
    );

    await renderBooking(SILK);
    await pickTime("10:30");
    await continueFromTime();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sorry, that time was just booked. Pick another.",
    );

    expect(screen.getByRole("button", { name: "10:30" })).not.toHaveClass(
      /slotSelected/,
    );

    await waitFor(() => expect(getAvailableSlots).toHaveBeenCalledTimes(2));
  });

  it("picking another time moves the same hold, and a reload keeps it", async () => {
    const { unmount } = await renderBooking(SILK);

    await pickTime("10:30");
    await continueFromTime();
    await user.click(await screen.findByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "10:00" }));
    await continueFromTime();

    expect(holdBooking).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startsAt: OPEN_TIMES[0],
        hold: { id: "hold-1", secret: "secret" },
      }),
    );

    unmount();
    await renderBooking(`${SILK}&resume=1`);
    await continueFromTime();

    expect(holdBooking).toHaveBeenLastCalledWith(
      expect.objectContaining({ hold: { id: "hold-1", secret: "secret" } }),
    );
  });

  it("an unknown stylist is not found; one who isn't taking bookings says so", async () => {
    vi.mocked(fetchPublicProfile).mockResolvedValueOnce(null);

    const { unmount } = renderWithStore(
      <BookingPage />,
      "/book?stylist=nobody",
    );

    expect(
      await screen.findByRole("heading", {
        name: "We couldn’t find this stylist",
      }),
    ).toBeInTheDocument();

    unmount();

    vi.mocked(fetchPublicProfile).mockResolvedValueOnce({
      ...getDemoProfile("tiwaras-house"),
      pause_on: true,
    });

    renderWithStore(<BookingPage />, "/book?stylist=tiwaras-house");

    const message = await screen.findByRole("heading", {
      name: "Tiwára's House isn’t taking bookings right now",
    });

    expect(message).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "View profile" })).toHaveAttribute(
      "href",
      "/tiwaras-house",
    );
  });

  it("signed-in clients booking a mobile stylist get their saved addresses", async () => {
    localStorage.setItem(
      "tw_addrs",
      JSON.stringify([
        {
          id: "home",
          label: "Home",
          line1: "12 Dickenson Road",
          line2: "",
          town: "Manchester",
          postcode: "M14 5TQ",
          isDefault: true,
        },
      ]),
    );

    await renderBooking(
      "stylist=naturallynia&service=naturallynia--wash-and-style",
      { signedIn: true },
    );

    await pickTime("10:30");
    await continueFromTime();

    const card = await screen.findByRole("heading", {
      level: 1,
      name: "Your details",
    });

    expect(card).toBeInTheDocument();
    expect(screen.getAllByText(/12 Dickenson Road/).length).toBeGreaterThan(0);
  });
});

describe("the mobile travel check", () => {
  beforeEach(() => vi.clearAllMocks());

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={createStore()}>{children}</Provider>
  );

  it("asks the server whether the address's point is inside the stylist's travel area", async () => {
    vi.mocked(isInTravelArea).mockResolvedValueOnce(false);

    const { result } = renderHook(
      () =>
        useTravelCheck(
          "service",
          {
            ...EMPTY_ADDRESS,
            line1: "1 High St",
            town: "Bolton",
            postcode: "BL1 4QR",
            lat: 53.58,
            lng: -2.43,
          },
          true,
        ),
      { wrapper },
    );

    await waitFor(() => expect(result.current.outBlock).toBe(true));

    expect(isInTravelArea).toHaveBeenCalledWith({
      serviceId: "service",
      lat: 53.58,
      lng: -2.43,
    });
  });

  it("doesn't check for stylists who don't travel", () => {
    renderHook(
      () =>
        useTravelCheck(
          "service",
          { ...EMPTY_ADDRESS, lat: 53.58, lng: -2.43 },
          false,
        ),
      { wrapper },
    );

    expect(isInTravelArea).not.toHaveBeenCalled();
  });
});
