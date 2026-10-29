import { screen, waitFor, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelBooking,
  getManagedBooking,
  getRescheduleSlots,
  rescheduleBooking,
  secureBookingLink,
  sendBookingCode,
  verifyBookingCode,
} from "../../../lib/manage-booking-api";
import type { ManagedBooking } from "../../../lib/manage-booking-api";
import { getOwnerManageToken } from "../../../lib/booking-invite-api";
import { renderWithStore } from "../../../test/render-with-store";
import { setupUser } from "../../../test/setup-user";
import { ManageBookingPage } from "..";

vi.mock("../../../lib/manage-booking-api", async (original) =>
  (await import("../../../test/booking-mocks")).mockManageBookingApi(original),
);

vi.mock("../../../lib/booking-invite-api", async (original) =>
  (await import("../../../test/booking-mocks")).mockBookingInviteApi(original),
);

const booking: ManagedBooking = {
  id: "booking-1",
  ref: "TH-ABC123",
  status: "confirmed",
  snapshot: {
    service_name: "Knotless braids",
    options: [{ label: "Medium" }, { label: "Shoulder" }],
    addons: [{ name: "Beads" }],
    colour: "1B Natural Black",
  },
  starts_at: "2026-10-22T16:30:00Z",
  ends_at: "2026-10-22T20:30:00Z",
  stylist_name: "Tiwára's House",
  stylist_slug: "tiwaras-house",
  is_mobile: false,
  where: "Tiwára's House, 14 Blossom Street, Manchester, M4 6AJ",
  price_pence: 7500,
  fee_pence: 163,
  paid_pence: 1663,
  terms: {
    mode: "deposit",
    deposit_pence: 1500,
    free_cancel_until: "2026-10-20T16:30:00Z",
    free_window_hours: 48,
  },
  notes: "Please use the side entrance",
  address_notes: null,
  reschedule_count: 0,
  calendar_key: "cal-key",
  is_verified: true,
  cancelled_at: null,
  can_cancel: true,
  can_reschedule: true,
  cancellation: {
    is_late: false,
    refund_pence: 1500,
    kept_pence: 0,
    charge_pence: 0,
    free_cancel_until: "2026-10-20T16:30:00Z",
  },
};

let user: UserEvent;

const renderPage = (query = "?token=tok") =>
  renderWithStore(<ManageBookingPage />, `/manage${query}`);

describe("the manage booking page", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["Date"],
      now: new Date("2026-10-14T09:00:00Z"),
    });

    vi.clearAllMocks();
    sessionStorage.clear();
    vi.mocked(getManagedBooking).mockResolvedValue(booking);
    user = setupUser();
  });

  afterEach(() => vi.useRealTimers());

  it("a valid link shows the booking, its terms and calendar links", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "You’re booked with Tiwára's House",
      }),
    ).toBeInTheDocument();

    expect(getManagedBooking).toHaveBeenCalledWith("tok");
    expect(screen.getByText("Booking ref TH-ABC123")).toBeInTheDocument();

    expect(
      screen.getByText("Medium · Shoulder · 1B Natural Black · Beads"),
    ).toBeInTheDocument();

    expect(screen.getByText("Thu 22 Oct, 17:30")).toBeInTheDocument();

    expect(
      screen.getByText("Free cancellation until Tue 20 Oct, 17:30"),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Apple Calendar" }),
    ).toHaveAttribute(
      "href",
      expect.stringContaining("/functions/v1/booking-calendar?key=cal-key"),
    );

    expect(
      screen.getByRole("link", { name: "Google Calendar" }),
    ).toHaveAttribute(
      "href",
      expect.stringContaining("dates=20261022T163000Z%2F20261022T203000Z"),
    );
  });

  it("an unknown or expired link says it isn't valid", async () => {
    vi.mocked(getManagedBooking).mockResolvedValue(null);
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "This link isn’t valid" }),
    ).toBeInTheDocument();
  });

  it("an address copied without its token points back to the booking email", async () => {
    window.sessionStorage.clear();
    renderPage("");

    expect(
      await screen.findByRole("heading", {
        name: "Open this from your booking email",
      }),
    ).toBeInTheDocument();

    expect(getManagedBooking).not.toHaveBeenCalled();
  });

  it("cancelling shows what's refunded before confirming, then the cancelled booking", async () => {
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Cancel booking" }),
    );

    const dialog = within(
      screen.getByRole("alertdialog", { name: "Cancel this booking?" }),
    );

    expect(
      dialog.getByText("Your £15.00 deposit is refunded to your card."),
    ).toBeInTheDocument();

    expect(dialog.queryByText(/booking fee/)).not.toBeInTheDocument();

    vi.mocked(getManagedBooking).mockResolvedValue({
      ...booking,
      status: "cancelled",
      can_cancel: false,
      can_reschedule: false,
    });

    await user.click(dialog.getByRole("button", { name: "Cancel booking" }));

    expect(cancelBooking).toHaveBeenCalledWith("tok");

    expect(
      await screen.findByRole("heading", { name: "Your booking is cancelled" }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "£15.00 is refunded to your card. It can take 5 to 10 working days.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Book again with Tiwára's House" }),
    ).toHaveAttribute("href", "/tiwaras-house");
  });

  it("an auto-cancelled booking shows as cancelled, with nothing left to change", async () => {
    vi.mocked(getManagedBooking).mockResolvedValue({
      ...booking,
      status: "auto_cancelled",
      can_cancel: false,
      can_reschedule: false,
    });

    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Your booking is cancelled" }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "Cancel booking" }),
    ).not.toBeInTheDocument();
  });

  it("opening the cancel dialog refreshes the terms, so a passed deadline shows", async () => {
    renderPage();
    await screen.findByRole("button", { name: "Cancel booking" });

    vi.mocked(getManagedBooking).mockResolvedValue({
      ...booking,
      cancellation: {
        ...booking.cancellation,
        is_late: true,
        refund_pence: 0,
        kept_pence: 1500,
      },
    });

    await user.click(screen.getByRole("button", { name: "Cancel booking" }));

    expect(
      await screen.findByText(
        "Your £15.00 deposit is kept under Tiwára's House's policy.",
      ),
    ).toBeInTheDocument();
  });

  it("keeping the booking closes the dialog without cancelling", async () => {
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Cancel booking" }),
    );

    await user.click(screen.getByRole("button", { name: "Keep booking" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(cancelBooking).not.toHaveBeenCalled();
  });

  it("rescheduling offers open times in a sheet, confirms and can't be done twice", async () => {
    vi.mocked(getRescheduleSlots).mockResolvedValue([
      "2026-10-24T09:00:00Z",
      "2026-10-24T09:30:00Z",
    ]);

    renderPage();

    await user.click(await screen.findByRole("button", { name: "Reschedule" }));

    expect(
      screen.getByRole("dialog", { name: "Pick a new time" }),
    ).toHaveTextContent("You can only change this once.");

    expect(getRescheduleSlots).toHaveBeenCalledWith({
      token: "tok",
      from: "2026-10-01",
      to: "2026-10-31",
    });

    const day = await screen.findByRole("button", { name: "24" });

    await waitFor(() => expect(day).toBeEnabled());
    await user.click(day);
    await user.click(screen.getByRole("button", { name: "10:30" }));

    expect(
      screen.getByText("Sat 24 Oct, 10:30 instead of Thu 22 Oct, 17:30"),
    ).toBeInTheDocument();

    expect(screen.queryByText(/free cancellation won’t apply/)).toBeNull();

    vi.mocked(getManagedBooking).mockResolvedValue({
      ...booking,
      starts_at: "2026-10-24T09:30:00Z",
      reschedule_count: 1,
      can_reschedule: false,
    });

    await user.click(screen.getByRole("button", { name: "Confirm new time" }));

    expect(rescheduleBooking).toHaveBeenCalledWith({
      token: "tok",
      startsAt: "2026-10-24T09:30:00Z",
    });

    expect(await screen.findByText("Booking rescheduled")).toBeInTheDocument();

    expect(
      await screen.findByText("You've already used your 1 free reschedule."),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "Reschedule" }),
    ).not.toBeInTheDocument();
  });

  it("a new time inside the free cancellation window is flagged before confirming", async () => {
    vi.mocked(getRescheduleSlots).mockResolvedValue(["2026-10-15T09:30:00Z"]);

    renderPage();

    await user.click(await screen.findByRole("button", { name: "Reschedule" }));

    const day = await screen.findByRole("button", { name: "15" });

    await waitFor(() => expect(day).toBeEnabled());
    await user.click(day);
    await user.click(screen.getByRole("button", { name: "10:30" }));

    expect(
      screen.getByText(
        "This time is within 48 hours, so free cancellation won’t apply and you can’t reschedule again.",
      ),
    ).toBeInTheDocument();
  });

  it("a time taken meanwhile says so", async () => {
    vi.mocked(getRescheduleSlots).mockResolvedValue(["2026-10-24T09:00:00Z"]);

    vi.mocked(rescheduleBooking).mockRejectedValueOnce({
      code: "P0001",
      message: "slot_taken",
    });

    renderPage();

    await user.click(await screen.findByRole("button", { name: "Reschedule" }));

    const day = await screen.findByRole("button", { name: "24" });

    await waitFor(() => expect(day).toBeEnabled());
    await user.click(day);
    await user.click(screen.getByRole("button", { name: "10:00" }));
    await user.click(screen.getByRole("button", { name: "Confirm new time" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sorry, that time was just booked. Pick another.",
    );
  });

  it("shows the client's notes, never their allergies", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", {
        name: "Your notes for Tiwára's House",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Please use the side entrance"),
    ).toBeInTheDocument();

    expect(screen.queryByText(/allerg/i)).not.toBeInTheDocument();
  });

  it("hides the notes section when there are no notes", async () => {
    vi.mocked(getManagedBooking).mockResolvedValue({ ...booking, notes: null });
    renderPage();

    await screen.findByText("Booking ref TH-ABC123");
    expect(screen.queryByText(/Your notes for/)).not.toBeInTheDocument();
  });

  it("a past appointment can't be changed", async () => {
    vi.mocked(getManagedBooking).mockResolvedValue({
      ...booking,
      can_cancel: false,
      can_reschedule: false,
    });

    renderPage();

    expect(
      await screen.findByText("This appointment has passed."),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Your appointment with Tiwára's House",
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("link", { name: "Apple Calendar" }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "Cancel booking" }),
    ).not.toBeInTheDocument();
  });

  it("a signed-in client opens their own booking from its ref", async () => {
    renderWithStore(<ManageBookingPage />, "/manage?ref=TH-ABC123", {
      signedIn: true,
    });

    expect(
      await screen.findByText("Booking ref TH-ABC123"),
    ).toBeInTheDocument();

    expect(getOwnerManageToken).toHaveBeenCalledWith("TH-ABC123");
    expect(getManagedBooking).toHaveBeenCalledWith("owner-token");
  });

  it("from the account, links back to the bookings", async () => {
    renderWithStore(<ManageBookingPage />, "/manage?ref=TH-ABC123", {
      signedIn: true,
    });

    expect(
      await screen.findByRole("link", { name: "Your bookings" }),
    ).toHaveAttribute("href", "/account?section=bookings");
  });

  it("someone else's booking ref isn't valid", async () => {
    vi.mocked(getOwnerManageToken).mockRejectedValueOnce(
      new Error("link_not_valid"),
    );

    renderWithStore(<ManageBookingPage />, "/manage?ref=TH-OTHER1", {
      signedIn: true,
    });

    expect(
      await screen.findByRole("heading", { name: "This link isn’t valid" }),
    ).toBeInTheDocument();
  });

  it("an unconfirmed link asks for the emailed code before rescheduling", async () => {
    vi.mocked(getManagedBooking).mockResolvedValue({
      ...booking,
      is_verified: false,
    });

    vi.mocked(verifyBookingCode).mockResolvedValueOnce("wrong_code");
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Reschedule" }));

    const dialog = within(
      screen.getByRole("dialog", { name: "Check your email" }),
    );

    expect(
      await dialog.findByText(
        "We sent a 6-digit code to n•••@gmail.com. Enter it to reschedule your booking.",
      ),
    ).toBeInTheDocument();

    expect(sendBookingCode).toHaveBeenCalledWith("tok");

    expect(
      screen.queryByRole("dialog", { name: "Pick a new time" }),
    ).toBeNull();

    await user.type(dialog.getByLabelText("6-digit code"), "111111");
    await user.click(dialog.getByRole("button", { name: "Confirm" }));

    expect(await dialog.findByRole("alert")).toHaveTextContent(
      "That code isn’t right.",
    );

    await user.clear(dialog.getByLabelText("6-digit code"));
    await user.type(dialog.getByLabelText("6-digit code"), "042817");
    await user.click(dialog.getByRole("button", { name: "Confirm" }));

    expect(
      await screen.findByRole("dialog", { name: "Pick a new time" }),
    ).toBeInTheDocument();

    expect(verifyBookingCode).toHaveBeenLastCalledWith({
      token: "tok",
      code: "042817",
    });

    expect(
      screen.queryByRole("dialog", { name: "Check your email" }),
    ).toBeNull();
  });

  it("an unconfirmed link asks for the code before the cancel dialog", async () => {
    vi.mocked(getManagedBooking).mockResolvedValue({
      ...booking,
      is_verified: false,
    });

    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Cancel booking" }),
    );

    const dialog = within(
      screen.getByRole("dialog", { name: "Check your email" }),
    );

    expect(
      await dialog.findByText(/Enter it to cancel your booking/),
    ).toBeInTheDocument();

    await user.type(dialog.getByLabelText("6-digit code"), "042817");
    await user.click(dialog.getByRole("button", { name: "Confirm" }));

    expect(
      await screen.findByRole("alertdialog", { name: "Cancel this booking?" }),
    ).toBeInTheDocument();

    expect(cancelBooking).not.toHaveBeenCalled();
  });

  it("a short code is caught before checking, and Not now closes", async () => {
    vi.mocked(getManagedBooking).mockResolvedValue({
      ...booking,
      is_verified: false,
    });

    renderPage();

    await user.click(await screen.findByRole("button", { name: "Reschedule" }));

    const dialog = within(
      screen.getByRole("dialog", { name: "Check your email" }),
    );

    await user.type(dialog.getByLabelText("6-digit code"), "12a3");
    expect(dialog.getByLabelText("6-digit code")).toHaveValue("123");
    await user.click(dialog.getByRole("button", { name: "Confirm" }));

    expect(dialog.getByRole("alert")).toHaveTextContent(
      "Enter the 6-digit code from the email.",
    );

    expect(verifyBookingCode).not.toHaveBeenCalled();
    await user.click(dialog.getByRole("button", { name: "Not now" }));

    expect(
      screen.queryByRole("dialog", { name: "Check your email" }),
    ).toBeNull();
  });

  it("too many codes says to wait", async () => {
    vi.mocked(getManagedBooking).mockResolvedValue({
      ...booking,
      is_verified: false,
    });

    vi.mocked(sendBookingCode).mockRejectedValueOnce(
      new Error("too_many_codes"),
    );

    renderPage();

    await user.click(await screen.findByRole("button", { name: "Reschedule" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You’ve asked for a lot of codes. Try again in an hour.",
    );
  });

  it("if the confirmation lapses, rescheduling asks for a new code", async () => {
    vi.mocked(getRescheduleSlots).mockResolvedValue(["2026-10-24T09:30:00Z"]);

    vi.mocked(rescheduleBooking).mockRejectedValueOnce({
      code: "P0001",
      message: "confirm_needed",
    });

    renderPage();

    await user.click(await screen.findByRole("button", { name: "Reschedule" }));

    const day = await screen.findByRole("button", { name: "24" });

    await waitFor(() => expect(day).toBeEnabled());
    await user.click(day);
    await user.click(screen.getByRole("button", { name: "10:30" }));
    await user.click(screen.getByRole("button", { name: "Confirm new time" }));

    expect(
      await screen.findByRole("dialog", { name: "Check your email" }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("dialog", { name: "Pick a new time" }),
    ).toBeNull();
  });

  it("if the confirmation lapses, cancelling asks for a new code", async () => {
    vi.mocked(cancelBooking).mockRejectedValueOnce(new Error("confirm_needed"));
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Cancel booking" }),
    );

    await user.click(
      within(
        screen.getByRole("alertdialog", { name: "Cancel this booking?" }),
      ).getByRole("button", { name: "Cancel booking" }),
    );

    expect(
      await screen.findByRole("dialog", { name: "Check your email" }),
    ).toBeInTheDocument();

    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("This wasn't me stops the old link after a tap, and leaves the address bar clean", async () => {
    renderPage("?secure=sec-1");

    expect(
      await screen.findByRole("heading", {
        name: "Stop your old booking link",
      }),
    ).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(/^\/manage$/),
    );

    expect(secureBookingLink).not.toHaveBeenCalled();
    expect(getManagedBooking).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Send me a new link" }),
    );

    expect(secureBookingLink).toHaveBeenCalledWith("sec-1");

    expect(
      await screen.findByRole("heading", {
        name: "Your old link no longer works",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/We’ve emailed a new booking link to n•••@gmail.com/),
    ).toBeInTheDocument();
  });

  it("a used This wasn't me link says so", async () => {
    vi.mocked(secureBookingLink).mockRejectedValueOnce({
      code: "P0001",
      message: "already_used",
    });

    renderPage("?secure=sec-1");

    await user.click(
      await screen.findByRole("button", { name: "Send me a new link" }),
    );

    expect(
      await screen.findByRole("heading", { name: "You’ve already done this" }),
    ).toBeInTheDocument();
  });

  it("an owner link that fails to load says so, not that the link is invalid", async () => {
    vi.mocked(getOwnerManageToken).mockRejectedValueOnce(
      new Error("Failed to fetch"),
    );

    renderWithStore(<ManageBookingPage />, "/manage?ref=TH-ABC123", {
      signedIn: true,
    });

    expect(
      await screen.findByRole("heading", {
        name: "We couldn’t load your booking",
      }),
    ).toBeInTheDocument();
  });

  it("?view=account forwards to Account → Shared", async () => {
    renderPage("?view=account");

    expect(await screen.findByTestId("location")).toHaveTextContent(
      "/account?section=shared",
    );
  });
});
