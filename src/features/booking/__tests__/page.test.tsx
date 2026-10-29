import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GUEST_DETAILS,
  renderBooking,
  renderSavedBooking,
} from "../../../test/render-booking";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";
import { stripeStub } from "../../../test/setup";
import { startCheckout } from "../../../lib/booking-api";
import { startCardsSession } from "../../../lib/client-cards";
import { fetchMySensitivity } from "../../../lib/client-sensitivities";

vi.mock("../../../lib/public-profiles", async (original) =>
  (await import("../../../test/booking-mocks")).mockPublicProfiles(original),
);

vi.mock("../../../lib/booking-api", async (original) =>
  (await import("../../../test/booking-mocks")).mockBookingApi(original),
);

vi.mock("../../../lib/client-cards", () => ({
  startCardsSession: vi.fn(() => Promise.resolve("cuss_secret")),
}));

vi.mock("../../../lib/client-sensitivities", () => ({
  fetchMySensitivity: vi.fn(() => Promise.resolve("")),
}));

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

  it("details: Continue shows every field error", async () => {
    await renderSavedBooking({ step: 4, guest: true });
    await user.click(screen.getAllByRole("button", { name: /^Continue/ })[0]!);
    await act(() => Promise.resolve());
    expect(screen.getByText("Enter your first name")).toBeInTheDocument();
    expect(screen.getByText("Enter a UK mobile number")).toBeInTheDocument();
  });

  it("details: errors clear as fields are fixed, then Continue goes to Review", async () => {
    await renderSavedBooking({ step: 4, guest: true });
    await user.click(screen.getAllByRole("button", { name: /^Continue/ })[0]!);
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

  it("time picked: Continue asks to log in or continue as guest before Your details", async () => {
    await renderSavedBooking();

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

  it("time picked: closing the account sheet stays on Time", async () => {
    await renderSavedBooking();

    await user.click(screen.getAllByRole("button", { name: /^Continue$/ })[0]!);
    await user.click(await screen.findByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("First name")).not.toBeInTheDocument();
  });

  it("time picked: the account sheet closes when the hold runs out", async () => {
    await renderSavedBooking();

    await user.click(screen.getAllByRole("button", { name: /^Continue$/ })[0]!);

    expect(
      await screen.findByRole("dialog", { name: "Have an account?" }),
    ).toBeInTheDocument();

    const later = Date.now() + 601_000;

    vi.spyOn(Date, "now").mockReturnValue(later);
    act(() => vi.advanceTimersByTime(1000));
    vi.mocked(Date.now).mockRestore();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    expect(
      screen.getByRole("alertdialog", { name: "Your slot is no longer held" }),
    ).toBeInTheDocument();
  });

  it("details: shows the logged-in contact card, edits name and mobile, and logs out", async () => {
    await renderSavedBooking({ step: 4 }, { signedIn: true });

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

    expect(screen.getByText("07700 900412")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByLabelText("First name")).toHaveValue("");
  });

  it("details: fills in what the client already shares with this stylist, and log out clears it", async () => {
    vi.mocked(fetchMySensitivity).mockResolvedValueOnce("Sensitive scalp");
    await renderSavedBooking({ step: 4 }, { signedIn: true });
    await act(() => vi.advanceTimersByTimeAsync(100));

    expect(fetchMySensitivity).toHaveBeenCalledWith("tiwaras-house");
    expect(screen.getByText("Still correct?")).toBeInTheDocument();
    expect(screen.getByText("Sensitive scalp")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(screen.queryByText("Sensitive scalp")).not.toBeInTheDocument();
  });

  it("details: a filled-in note arriving late leaves a box the client already changed alone", async () => {
    let finishLoading: (text: string) => void = () => {};

    vi.mocked(fetchMySensitivity).mockReturnValueOnce(
      new Promise((resolve) => {
        finishLoading = resolve;
      }),
    );

    await renderSavedBooking({ step: 4 }, { signedIn: true });

    const optIn = screen.getByRole("checkbox", {
      name: /I have allergies or sensitivities/,
    });

    await user.click(optIn);
    await user.click(optIn);

    await act(async () => finishLoading("Sensitive scalp"));
    await act(() => vi.advanceTimersByTimeAsync(100));

    expect(optIn).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByText("Sensitive scalp")).not.toBeInTheDocument();
  });

  it("details: notes stop at the server's 500 characters and count down from 400", async () => {
    await renderSavedBooking({
      step: 4,
      guest: true,
      details: { ...GUEST_DETAILS, notes: "x".repeat(399) },
    });

    expect(screen.queryByText(/\/ 500/)).not.toBeInTheDocument();

    const notes = screen.getByRole("textbox", {
      name: /Notes for your stylist/,
    });

    expect(notes).toHaveAttribute("maxLength", "500");
    await user.type(notes, "y");
    expect(screen.getByText("400 / 500")).toBeInTheDocument();
  });

  it("review: shows the policy card and Continue to payment", async () => {
    await renderSavedBooking({ step: 5, guest: true, details: GUEST_DETAILS });

    expect(
      screen.getByRole("heading", { level: 1, name: "Review your booking" }),
    ).toBeInTheDocument();

    expect(screen.getAllByText("Due today").length).toBeGreaterThan(0);

    expect(
      screen.getAllByRole("button", { name: /Continue to payment/ })[0],
    ).toBeInTheDocument();
  });

  it("pay: a skeleton stands in for the card fields until Stripe has loaded them", async () => {
    await renderSavedBooking({ step: 6, guest: true, details: GUEST_DETAILS });

    expect(screen.getByTestId("payment-skeleton")).toBeInTheDocument();
    await user.click(screen.getByTestId("payment-element"));
    expect(screen.queryByTestId("payment-skeleton")).not.toBeInTheDocument();
  });

  it("pay: a signed-in client's card box lists their saved cards and asks for a saved card's CVC", async () => {
    await renderSavedBooking({ step: 6 }, { signedIn: true });
    await act(() => vi.advanceTimersByTimeAsync(100));

    expect(screen.getByTestId("payment-element")).toBeInTheDocument();

    // Stripe offers its save tick only when the policy doesn't keep the card anyway
    expect(startCardsSession).toHaveBeenCalledWith(
      !stripeStub.elementsOptions?.setupFutureUsage,
    );

    expect(stripeStub.elementsOptions).toMatchObject({
      customerSessionClientSecret: "cuss_secret",
      paymentMethodOptions: { card: { require_cvc_recollection: true } },
    });

    expect(
      screen.queryByRole("checkbox", { name: /save this card/i }),
    ).not.toBeInTheDocument();
  });

  it("pay: a signed-in client's payment asks for the CVC like their card box", async () => {
    await renderSavedBooking({ step: 6 }, { signedIn: true });
    await act(() => vi.advanceTimersByTimeAsync(100));

    await user.click(
      screen.getByRole("button", { name: /^Pay £.* & confirm/ }),
    );

    expect(startCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ requireCvc: true }),
    );
  });

  it("pay: a saved-cards session that doesn't come still lets them pay by card", async () => {
    let finishSession: (secret: string) => void = () => {};

    vi.mocked(startCardsSession).mockReturnValueOnce(
      new Promise((resolve) => {
        finishSession = resolve;
      }),
    );

    await renderSavedBooking({ step: 6 }, { signedIn: true });

    expect(screen.queryByTestId("payment-element")).not.toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(5000));

    expect(screen.getByTestId("payment-element")).toBeInTheDocument();

    await act(async () => finishSession("cuss_late"));
    await act(() => vi.advanceTimersByTimeAsync(100));

    expect(stripeStub.elementsOptions).not.toHaveProperty(
      "customerSessionClientSecret",
    );
  });

  it("pay: guests just enter a card", async () => {
    await renderSavedBooking({ step: 6, guest: true, details: GUEST_DETAILS });

    expect(stripeStub.elementsOptions).not.toHaveProperty(
      "customerSessionClientSecret",
    );

    expect(stripeStub.elementsOptions).not.toHaveProperty(
      "paymentMethodOptions",
    );
  });

  it("pay: Stripe's decline shows its message and keeps the hold", async () => {
    stripeStub.confirmPayment.mockResolvedValueOnce({
      error: { type: "card_error", message: "Your card was declined." },
    });

    await renderSavedBooking({ step: 6, guest: true, details: GUEST_DETAILS });

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

    await renderSavedBooking({ step: 6, guest: true, details: GUEST_DETAILS });

    await user.click(
      screen.getByRole("button", { name: /^Pay £.* & confirm/ }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your card number is incomplete.",
    );

    expect(startCheckout).not.toHaveBeenCalled();
  });

  it("confirm: paying shows You're booked in. and the guest save row", async () => {
    await renderSavedBooking({ step: 6, guest: true, details: GUEST_DETAILS });

    await user.click(
      screen.getByRole("button", { name: /^Pay £.* & confirm/ }),
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "You're booked in.",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save my details" }));
    expect(screen.getByText("Check your email.")).toBeInTheDocument();
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
