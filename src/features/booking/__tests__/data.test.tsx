import { act, renderHook, screen, waitFor } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAvailableSlots,
  getBookingStatus,
  holdBooking,
  isInTravelArea,
  startCheckout,
} from "../../../lib/booking-api";
import { fetchClientAddresses } from "../../../lib/client-addresses";
import { FunctionError } from "../../../lib/invoke-function";
import { fetchCatalogue } from "../../../lib/catalogue";
import { fetchPublicProfile } from "../../../lib/public-profiles";
import { api } from "../../../stores/api-slice";
import { createStore } from "../../../stores/store";
import { getDemoProfile } from "../../../test/demo-profile";
import { renderBooking } from "../../../test/render-booking";
import { renderWithStore } from "../../../test/render-with-store";
import { stripeStub } from "../../../test/setup";
import { setupUser } from "../../../test/setup-user";
import { EMPTY_ADDRESS } from "../logic/constants";
import { BookingPage } from "../route";
import { useTravelCheck } from "../hooks/use-travel-check";

vi.mock("../../../lib/public-profiles", async (original) =>
  (await import("../../../test/booking-mocks")).mockPublicProfiles(original),
);

vi.mock("../../../lib/client-cards", () => ({
  startCardsSession: vi.fn(() => Promise.resolve("cuss_secret")),
}));

vi.mock("../../../lib/client-sensitivities", () => ({
  fetchMySensitivity: vi.fn(() => Promise.resolve("")),
}));

vi.mock("../../../lib/client-addresses", () => ({
  fetchClientAddresses: vi.fn(() => Promise.resolve([])),
  saveClientAddress: vi.fn(),
  deleteClientAddress: vi.fn(),
}));

vi.mock("../../../lib/booking-api", async (original) => ({
  ...(await (
    await import("../../../test/booking-mocks")
  ).mockBookingApi(original)),
  isInTravelArea: vi.fn(),
}));

const SILK = "stylist=tiwaras-house&service=tiwaras-house--silk-press";

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

const payAsGuest = async () => {
  await pickTime("10:30");
  await continueFromTime();

  await user.click(
    await screen.findByRole("button", { name: "Continue as guest" }),
  );

  await user.type(screen.getByLabelText("First name"), "Nia");
  await user.type(screen.getByLabelText("Last name"), "Okafor");
  await user.type(screen.getByLabelText("Email"), "nia@gmail.com");
  await user.type(screen.getByLabelText("Mobile, UK number"), "07700900123");
  await user.click(screen.getAllByRole("button", { name: /^Continue/ })[0]!);

  await user.click(
    (await screen.findAllByRole("button", { name: /Continue to payment/ }))[0]!,
  );

  await user.click(screen.getByRole("button", { name: /^Pay £.* & confirm/ }));
};

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
      new FunctionError("slot_taken"),
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

  it("a resumed booking whose time has gone since says it was just booked", async () => {
    localStorage.setItem(
      "tw_bk_draft_tiwaras-house",
      JSON.stringify({
        at: Date.now(),
        step: 3,
        serviceId: "tiwaras-house--silk-press",
        selection: {
          size: null,
          length: null,
          colour: "",
          own: {},
          addons: [],
        },
        calendarMonth: 9,
        calendarYear: 2026,
        date: 20,
        time: "11:00",
        details: { first: "", last: "", email: "", phone: "", notes: "" },
        appointmentAddress: { ...EMPTY_ADDRESS },
        holdUntil: Date.now() + 300_000,
        holdId: "hold-1",
        holdSecret: "secret",
      }),
    );

    await renderBooking(`${SILK}&resume=1`);

    await waitFor(() =>
      expect(
        screen.getAllByRole("button", { name: /^Continue$/ })[0],
      ).toBeEnabled(),
    );

    await continueFromTime();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sorry, that time was just booked. Pick another.",
    );

    expect(holdBooking).not.toHaveBeenCalled();
  });

  it("paying sends the hold, details and Turnstile token; only the server's confirmation books it", async () => {
    await renderBooking(SILK);
    await payAsGuest();

    await waitFor(() => expect(startCheckout).toHaveBeenCalled());

    expect(startCheckout).toHaveBeenCalledWith({
      hold: { id: "hold-1", secret: "secret" },
      contact: {
        first: "Nia",
        last: "Okafor",
        email: "nia@gmail.com",
        phone: "07700900123",
      },
      notes: "",
      allergies: "",
      clearAllergies: false,
      requireCvc: false,
      turnstileToken: "test-captcha-token",
    });

    expect(
      await screen.findByRole("heading", { name: "You're booked in." }),
    ).toBeInTheDocument();

    expect(stripeStub.confirmPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        clientSecret: "pi_secret",
        redirect: "if_required",
      }),
    );

    expect(getBookingStatus).toHaveBeenCalledWith({
      id: "hold-1",
      secret: "secret",
    });

    expect(screen.getByText("TH-TEST01")).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Google Calendar" }),
    ).toHaveAttribute(
      "href",
      expect.stringContaining("dates=20261020T093000Z%2F20261020T113000Z"),
    );
  });

  it("a paid booking waits for the server before it shows as booked", async () => {
    vi.mocked(getBookingStatus).mockResolvedValue({
      status: "held",
      ref: "TH-TEST01",
      starts_at: "2026-10-20T09:30:00Z",
      ends_at: "2026-10-20T11:30:00Z",
    });

    await renderBooking(SILK);
    await payAsGuest();

    expect(
      await screen.findByRole("button", { name: /Confirming…/ }),
    ).toBeDisabled();

    expect(
      screen.queryByRole("heading", { name: "You're booked in." }),
    ).not.toBeInTheDocument();
  });

  it("a slow confirmation says the payment went through, keeps waiting, and never expires the hold", async () => {
    vi.mocked(getBookingStatus).mockResolvedValue({
      status: "held",
      ref: "TH-TEST01",
      starts_at: "2026-10-20T09:30:00Z",
      ends_at: "2026-10-20T11:30:00Z",
    });

    await renderBooking(SILK);
    await payAsGuest();
    await waitFor(() => expect(getBookingStatus).toHaveBeenCalled());
    await act(() => vi.advanceTimersByTimeAsync(11 * 60_000));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your payment went through and we're confirming your booking.",
    );

    expect(
      screen.queryByRole("alertdialog", {
        name: "Your slot is no longer held",
      }),
    ).not.toBeInTheDocument();

    vi.mocked(getBookingStatus).mockResolvedValue({
      status: "confirmed",
      ref: "TH-TEST01",
      starts_at: "2026-10-20T09:30:00Z",
      ends_at: "2026-10-20T11:30:00Z",
    });

    await act(() => vi.advanceTimersByTimeAsync(2000));

    expect(
      screen.getByRole("heading", { name: "You're booked in." }),
    ).toBeInTheDocument();
  });

  it("paid after someone else took the time: says it was refunded", async () => {
    vi.mocked(getBookingStatus).mockResolvedValue({
      status: "refunded",
      ref: "TH-TEST01",
      starts_at: "2026-10-20T09:30:00Z",
      ends_at: "2026-10-20T11:30:00Z",
    });

    await renderBooking(SILK);
    await payAsGuest();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sorry, 10:30 was booked by someone else while you paid. We've refunded you in full.",
    );

    expect(
      screen.getByRole("button", { name: "Pick another time" }),
    ).toBeInTheDocument();
  });

  it("a hold that ran out before paying says so, with nothing charged", async () => {
    vi.mocked(startCheckout).mockRejectedValueOnce(
      new FunctionError("hold_not_found"),
    );

    await renderBooking(SILK);
    await payAsGuest();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sorry, 10:30 is no longer held for you. You haven't been charged.",
    );

    expect(stripeStub.confirmPayment).not.toHaveBeenCalled();

    expect(
      screen.getByRole("button", { name: "Pick another time" }),
    ).toBeInTheDocument();
  });

  it("a failed Turnstile check blocks paying, and a fresh check lets them try again", async () => {
    vi.mocked(startCheckout).mockRejectedValueOnce(
      new FunctionError("turnstile_failed"),
    );

    await renderBooking(SILK);
    await payAsGuest();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't check this browser. Try again.",
    );

    expect(stripeStub.confirmPayment).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: /^Pay £.* & confirm/ }),
    );

    expect(startCheckout).toHaveBeenCalledTimes(2);

    await waitFor(() =>
      expect(stripeStub.confirmPayment).toHaveBeenCalledTimes(1),
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

  it("without the catalogue, a stylist who isn't taking bookings still says so; a bookable one can't load", async () => {
    vi.mocked(fetchCatalogue)
      .mockRejectedValueOnce(new Error("offline"))
      .mockRejectedValueOnce(new Error("offline"));

    vi.mocked(fetchPublicProfile).mockResolvedValueOnce({
      ...getDemoProfile("tiwaras-house"),
      pause_on: true,
    });

    const { unmount } = renderWithStore(
      <BookingPage />,
      "/book?stylist=tiwaras-house",
      { isCatalogueLoading: true },
    );

    expect(
      await screen.findByRole("heading", {
        name: "Tiwára's House isn’t taking bookings right now",
      }),
    ).toBeInTheDocument();

    unmount();

    renderWithStore(<BookingPage />, "/book?stylist=tiwaras-house", {
      isCatalogueLoading: true,
    });

    expect(
      await screen.findByRole("heading", {
        name: "We couldn’t load this page",
      }),
    ).toBeInTheDocument();
  });

  it("signed-in clients booking a mobile stylist get their saved addresses", async () => {
    vi.mocked(fetchClientAddresses).mockResolvedValue([
      {
        id: "home",
        label: "Home",
        line1: "12 Dickenson Road",
        line2: "",
        town: "Manchester",
        postcode: "M14 5TQ",
        isDefault: true,
      },
    ]);

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

  it("an address added elsewhere keeps the client's choice of a different address", async () => {
    const home = {
      id: "home",
      label: "Home",
      line1: "12 Dickenson Road",
      line2: "",
      town: "Manchester",
      postcode: "M14 5TQ",
      isDefault: true,
    };

    vi.mocked(fetchClientAddresses)
      .mockResolvedValueOnce([home])
      .mockResolvedValue([
        home,
        { ...home, id: "work", label: "Work", isDefault: false },
      ]);

    const { store } = await renderBooking(
      "stylist=naturallynia&service=naturallynia--wash-and-style",
      { signedIn: true },
    );

    await pickTime("10:30");
    await continueFromTime();

    const different = await screen.findByRole("radio", {
      name: /A different address/,
    });

    await user.click(different);

    act(() => {
      store.dispatch(api.util.invalidateTags(["Addresses"]));
    });

    await waitFor(() => expect(fetchClientAddresses).toHaveBeenCalledTimes(2));
    await act(() => vi.advanceTimersByTimeAsync(50));

    expect(
      screen.getByRole("radio", { name: /A different address/ }),
    ).toHaveAttribute("aria-checked", "true");
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
