import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../test/render-with-store";
import { BookingPage } from "../booking-page";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

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
  });

  afterEach(() => vi.useRealTimers());

  it("starts on Pick a service and moves to Customise for a braids service", async () => {
    renderWithStore(<BookingPage />, "/book?stylist=tiwaras-house");

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

  it("details-errors: Continue shows every field error", () => {
    renderWithStore(<BookingPage />, "/book?fixture=details-errors");
    expect(screen.getByText("Enter your first name")).toBeInTheDocument();
    expect(screen.getByText("Enter a UK mobile number")).toBeInTheDocument();
  });

  it("review: shows the policy card and Continue to payment", () => {
    renderWithStore(<BookingPage />, "/book?fixture=review");

    expect(
      screen.getByRole("heading", { level: 1, name: "Review your booking" }),
    ).toBeInTheDocument();

    expect(screen.getAllByText("Due today").length).toBeGreaterThan(0);

    expect(
      screen.getAllByRole("button", { name: /Continue to payment/ })[0],
    ).toBeInTheDocument();
  });

  it("pay: an incomplete card shows an error; the declined test card is declined", async () => {
    renderWithStore(<BookingPage />, "/book?fixture=pay");
    const pay = screen.getByRole("button", { name: /^Pay £.* & confirm/ });

    await user.click(pay);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Check the card number — it looks incomplete.",
    );

    const type = async (label: string, value: string) =>
      await user.type(screen.getByLabelText(label), value);

    await type("Card number", "4000000000000002");
    await type("Expiry", "1229");
    await type("Security code", "123");
    await type("Name on card", "Nia Okafor");
    await type("Billing postcode", "M14 5TQ");
    await user.click(pay);
    act(() => vi.advanceTimersByTime(900));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your card was declined.",
    );
  });

  it("confirm: shows You're booked in. and the guest save row", async () => {
    renderWithStore(<BookingPage />, "/book?fixture=confirm");

    expect(
      screen.getByRole("heading", { level: 1, name: "You're booked in." }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save my details" }));
    expect(screen.getByText("Check your email.")).toBeInTheDocument();
  });

  it("hold-expired and leave fixtures open their dialogs", () => {
    const { unmount } = renderWithStore(
      <BookingPage />,
      "/book?fixture=hold-expired",
    );

    expect(
      screen.getByRole("alertdialog", { name: "Your slot is no longer held" }),
    ).toBeInTheDocument();

    unmount();
    renderWithStore(<BookingPage />, "/book?fixture=leave");

    expect(
      screen.getByRole("dialog", { name: "Leave this booking?" }),
    ).toBeInTheDocument();
  });

  it("a draft is saved and offered back on the next visit", async () => {
    const { unmount } = renderWithStore(
      <BookingPage />,
      "/book?stylist=tiwaras-house",
    );

    await user.click(screen.getByRole("button", { name: /^Knotless braids/ }));
    unmount();
    renderWithStore(<BookingPage />, "/book?stylist=tiwaras-house");

    expect(
      screen.getByRole("region", { name: "Unfinished booking" }),
    ).toHaveTextContent("Knotless braids");
  });
});
