import { screen, waitFor, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchClientCards,
  removeClientCard,
  setDefaultCard,
  startCardSetup,
} from "../../../lib/client-cards";
import { renderWithStore } from "../../../test/render-with-store";
import { stripeStub } from "../../../test/setup";
import { setupUser } from "../../../test/setup-user";
import type { SavedCard } from "../data";
import { AccountPage } from "..";

vi.mock("../../../lib/client-cards", () => ({
  fetchClientCards: vi.fn(),
  startCardSetup: vi.fn(),
  setDefaultCard: vi.fn(),
  removeClientCard: vi.fn(),
}));

const VISA: SavedCard = {
  id: "pm_visa",
  brand: "Visa",
  last4: "4242",
  expiry: "08/28",
  isDefault: true,
};

const MASTERCARD: SavedCard = {
  id: "pm_mc",
  brand: "Mastercard",
  last4: "4444",
  expiry: "11/29",
  isDefault: false,
};

let user: UserEvent;

const renderPayments = async () => {
  renderWithStore(<AccountPage />, "/account?section=payments", {
    signedIn: true,
  });

  await screen.findByText(/Visa/);
};

const expectToast = (message: string) =>
  waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(message));

describe("Account payment methods", () => {
  beforeEach(() => {
    user = setupUser();

    vi.mocked(fetchClientCards)
      .mockReset()
      .mockResolvedValue([VISA, MASTERCARD]);

    vi.mocked(startCardSetup).mockReset().mockResolvedValue("seti_secret");
    vi.mocked(setDefaultCard).mockReset().mockResolvedValue([VISA, MASTERCARD]);
    vi.mocked(removeClientCard).mockReset().mockResolvedValue([VISA]);
    stripeStub.confirmSetup.mockClear();
  });

  it("cards that don't load say so with try again, not that there are none", async () => {
    vi.mocked(fetchClientCards)
      .mockReset()
      .mockRejectedValue(new Error("offline"));

    renderWithStore(<AccountPage />, "/account?section=payments", {
      signedIn: true,
    });

    expect(
      await screen.findByText("Saved cards didn’t load"),
    ).toBeInTheDocument();

    expect(screen.queryByText(/No saved cards/)).not.toBeInTheDocument();
  });

  it("make default stays off while the change is saving", async () => {
    vi.mocked(setDefaultCard)
      .mockReset()
      .mockReturnValue(new Promise(() => {}));

    await renderPayments();
    await user.click(screen.getByRole("button", { name: "Make default" }));

    expect(screen.getByRole("button", { name: "Make default" })).toBeDisabled();

    expect(
      screen.getByRole("button", { name: "Remove Mastercard ending 4444" }),
    ).toBeDisabled();
  });

  it("lists the cards saved with Stripe, default first", async () => {
    await renderPayments();

    expect(screen.getByText("Visa •••• 4242")).toBeInTheDocument();
    expect(screen.getByText("Mastercard •••• 4444")).toBeInTheDocument();
    expect(screen.getAllByText("Default")).toHaveLength(1);
  });

  it("adds a card through Stripe's card fields and can make it the default", async () => {
    await renderPayments();
    await user.click(screen.getByRole("button", { name: "Add a card" }));

    const dialog = within(screen.getByRole("dialog"));

    expect(dialog.queryByPlaceholderText(/1234/)).not.toBeInTheDocument();

    await user.click(
      dialog.getByRole("checkbox", { name: "Make this my default card" }),
    );

    await user.click(dialog.getByRole("button", { name: "Save card" }));
    await expectToast("Card saved");

    expect(stripeStub.confirmSetup).toHaveBeenCalledWith(
      expect.objectContaining({
        clientSecret: "seti_secret",
        redirect: "if_required",
      }),
    );

    expect(setDefaultCard).toHaveBeenCalledWith("pm_new");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("a declined card says why and keeps the dialog open", async () => {
    stripeStub.confirmSetup.mockResolvedValueOnce({
      error: { message: "Your card was declined." },
    } as never);

    await renderPayments();
    await user.click(screen.getByRole("button", { name: "Add a card" }));
    await user.click(screen.getByRole("button", { name: "Save card" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your card was declined.",
    );

    expect(setDefaultCard).not.toHaveBeenCalled();
  });

  it("makes another card the default and removes one", async () => {
    await renderPayments();
    await user.click(screen.getByRole("button", { name: "Make default" }));
    await expectToast("Mastercard •••• 4444 is now your default card");
    expect(setDefaultCard).toHaveBeenCalledWith("pm_mc");

    await user.click(
      screen.getByRole("button", { name: "Remove Mastercard ending 4444" }),
    );

    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Remove card",
      }),
    );

    await expectToast("Card removed");
    expect(removeClientCard).toHaveBeenCalledWith("pm_mc");
  });

  it("a card holding an upcoming booking isn't removed", async () => {
    vi.mocked(removeClientCard).mockRejectedValue(new Error("card_in_use"));
    await renderPayments();

    await user.click(
      screen.getByRole("button", { name: "Remove Mastercard ending 4444" }),
    );

    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Remove card",
      }),
    );

    await expectToast("This card is needed for an upcoming booking");
  });
});
