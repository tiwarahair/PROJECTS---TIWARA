import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../test/render-with-store";
import { getDemoBooking } from "./manage-booking-logic";
import { ManageBookingPage } from "./manage-booking-page";

describe("ManageBookingPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });

  afterEach(() => vi.useRealTimers());

  it("shows the booking and what is shared with the stylist", () => {
    renderWithStore(<ManageBookingPage />, "/manage");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "You’re booked with Amara Beauty",
      }),
    ).toBeInTheDocument();

    expect(screen.getByText("Sensitive scalp")).toBeInTheDocument();

    expect(
      screen.getByText(getDemoBooking("amara-beauty").total),
    ).toBeInTheDocument();
  });

  it("Edit opens the allergy field; Save stores the text and shows a toast that clears", () => {
    renderWithStore(<ManageBookingPage />, "/manage");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Nut allergy" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Nut allergy")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    act(() => vi.advanceTimersByTime(2600));
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });

  it("Remove asks first, then clears to None shared", () => {
    renderWithStore(<ManageBookingPage />, "/manage");
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    const dialog = screen.getByRole("alertdialog", { name: "Remove this?" });

    expect(dialog).toHaveTextContent("Amara Beauty won’t see it any more.");
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }));
    expect(screen.getByText("None shared")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("?view=account forwards to Account → Shared with stylists", () => {
    renderWithStore(<ManageBookingPage />, "/manage?view=account");

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/account?section=shared",
    );
  });
});
