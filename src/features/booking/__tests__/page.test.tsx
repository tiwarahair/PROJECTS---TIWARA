import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderBooking } from "../../../test/render-booking";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";
import { stripeStub } from "../../../test/setup";
import { startCheckout } from "../../../lib/booking-api";

vi.mock("../../../lib/public-profiles", async (original) =>
  (await import("../../../test/booking-mocks")).mockPublicProfiles(original),
);

vi.mock("../../../lib/booking-api", async (original) =>
  (await import("../../../test/booking-mocks")).mockBookingApi(original),
);

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

describe("BookingPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });

    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => vi.useRealTimers());

  it("starts on Pick a service and moves to Customise for a braids service", async () => {
    await renderBooking("stylist=tiwaras-house");

    expect(
      screen.getByRole("heading", { level: 1, name: "Pick a service" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Knotless braids/ }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Make it yours" }),
    ).toBeInTheDocument();

    expect(screen.getAllByRole("status")[0]).toHaveTextContent(
      "Choose a size and length",
    );
  });

  it("details-errors: Continue shows every field error", async () => {
    await renderBooking("fixture=details-errors");
    await act(() => Promise.resolve());
    expect(screen.getByText("Enter your first name")).toBeInTheDocument();
    expect(screen.getByText("Enter a UK mobile number")).toBeInTheDocument();
  });

  it("details: errors clear as fields are fixed, then Continue goes to Review", async () => {
    await renderBooking("fixture=details-errors");
    await act(() => Promise.resolve());

    await user.type(screen.getByLabelText("First name"), "Nia");
    await act(() => Promise.resolve());
    expect(screen.queryByText("Enter your first name")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Last name"), "Okafor");
    await user.type(screen.getByLabelText("Email"), "nia@gmail.com");
    await user.type(screen.getByLabelText("Mobile, UK number"), "07700a900123");

    expect(screen.getByLabelText("Mobile, UK number")).toHaveValue(
      "07700900123",
    );

    await user.click(screen.getAllByRole("button", { name: /^Continue/ })[0]!);
    await act(() => Promise.resolve());

    expect(
      screen.getByRole("heading", { level: 1, name: "Review your booking" }),
    ).toBeInTheDocument();
  });

  it("time-picked: Continue asks to log in or continue as guest before Your details", async () => {
    await renderBooking("fixture=time-picked");

    await user.click(screen.getAllByRole("button", { name: /^Continue$/ })[0]!);

    const dialog = within(
      await screen.findByRole("dialog", { name: "Have an account?" }),
    );

    expect(dialog.getByRole("button", { name: "Log in" })).toBeInTheDocument();

    await user.click(dialog.getByRole("button", { name: "Continue as guest" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Your details" }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText("First name")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("time-picked: closing the account sheet stays on Time", async () => {
    await renderBooking("fixture=time-picked");

    await user.click(screen.getAllByRole("button", { name: /^Continue$/ })[0]!);
    await user.click(await screen.findByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("First name")).not.toBeInTheDocument();
  });

  it("time-picked: the account sheet closes when the hold runs out", async () => {
    await renderBooking("fixture=time-picked&hold=2");

    await user.click(screen.getAllByRole("button", { name: /^Continue$/ })[0]!);

    expect(
      await screen.findByRole("dialog", { name: "Have an account?" }),
    ).toBeInTheDocument();

    const later = Date.now() + 3000;

    vi.spyOn(Date, "now").mockReturnValue(later);
    act(() => vi.advanceTimersByTime(1000));
    vi.mocked(Date.now).mockRestore();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    expect(
      screen.getByRole("alertdialog", { name: "Your slot is no longer held" }),
    ).toBeInTheDocument();
  });

  it("details-card: shows the logged-in contact card, edits name and mobile, and logs out", async () => {
    await renderBooking("fixture=details-card");

    expect(screen.getByText("Nia Okafor")).toBeInTheDocument();
    expect(screen.queryByLabelText("First name")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit your details" }));

    expect(screen.getByLabelText("First name")).toHaveValue("Nia");

    expect(
      screen.queryByRole("textbox", { name: "Email" }),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Change your email in Account" }),
    ).toHaveAttribute("href", "/account?section=personal");

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("07700 900123")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByLabelText("First name")).toHaveValue("");
  });

  it("review: shows the policy card and Continue to payment", async () => {
    await renderBooking("fixture=review");

    expect(
      screen.getByRole("heading", { level: 1, name: "Review your booking" }),
    ).toBeInTheDocument();

    expect(screen.getAllByText("Due today").length).toBeGreaterThan(0);

    expect(
      screen.getAllByRole("button", { name: /Continue to payment/ })[0],
    ).toBeInTheDocument();
  });

  it("pay: a skeleton stands in for the card fields until Stripe has loaded them", async () => {
    await renderBooking("fixture=pay");

    expect(screen.getByTestId("payment-skeleton")).toBeInTheDocument();
    await user.click(screen.getByTestId("payment-element"));
    expect(screen.queryByTestId("payment-skeleton")).not.toBeInTheDocument();
  });

  it("pay: Stripe's decline shows its message and keeps the hold", async () => {
    stripeStub.confirmPayment.mockResolvedValueOnce({
      error: { type: "card_error", message: "Your card was declined." },
    });

    await renderBooking("fixture=pay");

    expect(screen.getByTestId("payment-element")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /^Pay £.* & confirm/ }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your card was declined.",
    );

    expect(
      screen.getAllByRole("timer", { hidden: true })[0],
    ).toBeInTheDocument();
  });

  it("pay: an incomplete card is Stripe's to explain, and nothing is sent", async () => {
    stripeStub.submit.mockResolvedValueOnce({
      error: { message: "Your card number is incomplete." },
    });

    await renderBooking("fixture=pay");

    await user.click(
      screen.getByRole("button", { name: /^Pay £.* & confirm/ }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your card number is incomplete.",
    );

    expect(startCheckout).not.toHaveBeenCalled();
  });

  it("confirm: shows You're booked in. and the guest save row", async () => {
    await renderBooking("fixture=confirm");

    expect(
      screen.getByRole("heading", { level: 1, name: "You're booked in." }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save my details" }));
    expect(screen.getByText("Check your email.")).toBeInTheDocument();
  });

  it("hold-expired and leave fixtures open their dialogs", async () => {
    const { unmount } = await renderBooking("fixture=hold-expired");

    expect(
      screen.getByRole("alertdialog", { name: "Your slot is no longer held" }),
    ).toBeInTheDocument();

    unmount();
    await renderBooking("fixture=leave");

    expect(
      screen.getByRole("dialog", { name: "Leave this booking?" }),
    ).toBeInTheDocument();
  });

  it("leaving after picking a service asks first; Keep booking stays, Leave goes", async () => {
    await renderBooking("stylist=tiwaras-house");
    await user.click(screen.getByRole("button", { name: /^Knotless braids/ }));
    await user.click(screen.getByRole("link", { name: /Exit booking/ }));

    expect(
      screen.getByRole("dialog", { name: "Leave this booking?" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Keep booking" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/book");

    await user.click(screen.getByRole("link", { name: /Exit booking/ }));
    await user.click(screen.getByRole("button", { name: "Leave" }));
    expect(screen.getByTestId("location")).not.toHaveTextContent("/book");
  });

  it("a draft is saved and offered back on the next visit", async () => {
    const { unmount } = await renderBooking("stylist=tiwaras-house");

    await user.click(screen.getByRole("button", { name: /^Knotless braids/ }));
    unmount();
    await renderBooking("stylist=tiwaras-house");

    expect(
      screen.getByRole("region", { name: "Unfinished booking" }),
    ).toHaveTextContent("Knotless braids");
  });
});
