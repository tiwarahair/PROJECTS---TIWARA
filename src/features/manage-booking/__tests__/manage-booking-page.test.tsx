import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../test/render-with-store";
import { getDemoBooking } from "../manage-booking-logic";
import { ManageBookingPage } from "../manage-booking-page";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

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

  it("Edit opens the allergy field; Save stores the text and shows a toast that clears", async () => {
    renderWithStore(<ManageBookingPage />, "/manage");
    await user.click(screen.getByRole("button", { name: "Edit" }));

    await user.clear(screen.getByRole("textbox"));
    await user.type(screen.getByRole("textbox"), "Nut allergy");

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Nut allergy")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    act(() => vi.advanceTimersByTime(2600));
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });

  it("Remove asks first, then clears to None shared", async () => {
    renderWithStore(<ManageBookingPage />, "/manage");
    await user.click(screen.getByRole("button", { name: "Remove" }));
    const dialog = screen.getByRole("alertdialog", { name: "Remove this?" });

    expect(dialog).toHaveTextContent("Amara Beauty won’t see it any more.");
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));
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
