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

  it("details-errors: Continue shows every field error", async () => {
    renderWithStore(<BookingPage />, "/book?fixture=details-errors");
    await act(() => Promise.resolve());
    expect(screen.getByText("Enter your first name")).toBeInTheDocument();
    expect(screen.getByText("Enter a UK mobile number")).toBeInTheDocument();
  });

  it("details: errors clear as fields are fixed, then Continue goes to Review", async () => {
    renderWithStore(<BookingPage />, "/book?fixture=details-errors");
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

  it("leaving after picking a service asks first; Keep booking stays, Leave goes", async () => {
    renderWithStore(<BookingPage />, "/book?stylist=tiwaras-house");
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
