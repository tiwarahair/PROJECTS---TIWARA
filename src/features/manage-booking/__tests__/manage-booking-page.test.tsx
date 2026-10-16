import { screen, waitFor, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelBooking,
  getManagedBooking,
  getRescheduleSlots,
  rescheduleBooking,
  updateBookingAllergies,
} from "../../../lib/manage-booking-api";
import type { ManagedBooking } from "../../../lib/manage-booking-api";
import { renderWithStore } from "../../../test/render-with-store";
import { setupUser } from "../../../test/setup-user";
import { ManageBookingPage } from "../manage-booking-page";

vi.mock("../../../lib/manage-booking-api", async (original) =>
  (await import("../../../test/booking-mocks")).mockManageBookingApi(original),
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
  },
  allergies: "Sensitive scalp",
  reschedule_count: 0,
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
      expect.stringContaining("/functions/v1/booking-calendar?token=tok"),
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

  it("a time taken meanwhile says so", async () => {
    vi.mocked(getRescheduleSlots).mockResolvedValue(["2026-10-24T09:00:00Z"]);
    vi.mocked(rescheduleBooking).mockRejectedValueOnce(new Error("slot_taken"));

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

  it("sharing allergies needs the consent tick", async () => {
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Edit" }));
    await user.type(screen.getByRole("textbox"), ", latex");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Tick the box to share this with Tiwára's House.",
    );

    expect(updateBookingAllergies).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("checkbox", {
        name: "Share this with Tiwára's House for this booking",
      }),
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(updateBookingAllergies).toHaveBeenCalledWith({
      token: "tok",
      allergies: "Sensitive scalp, latex",
      consent: true,
    });

    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("removing allergies asks first, without an old message from editing", async () => {
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(await screen.findByRole("button", { name: "Remove" }));

    const dialog = within(
      screen.getByRole("alertdialog", { name: "Remove this?" }),
    );

    expect(dialog.queryByRole("alert")).not.toBeInTheDocument();

    await user.click(dialog.getByRole("button", { name: "Remove" }));

    expect(updateBookingAllergies).toHaveBeenCalledWith({
      token: "tok",
      allergies: "",
      consent: false,
    });
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

  it("?view=account forwards to Account → Shared", async () => {
    renderPage("?view=account");

    expect(await screen.findByTestId("location")).toHaveTextContent(
      "/account?section=shared",
    );
  });
});
