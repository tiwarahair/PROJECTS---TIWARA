import { screen, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchClientBookings } from "../../../lib/client-bookings";
import { renderWithStore } from "../../../test/render-with-store";
import { setupUser } from "../../../test/setup-user";
import type { AccountBooking } from "../data";
import { AccountPage } from "..";

vi.mock("../../../lib/client-bookings", () => ({
  fetchClientBookings: vi.fn(),
}));

const DAY_MS = 864e5;

const BOOKING: AccountBooking = {
  id: "b1",
  ref: "TH-48213",
  status: "confirmed",
  service: "Knotless braids",
  customisation: "Medium · Shoulder",
  stylistSlug: "crown-studio",
  stylistName: "Crown Studio",
  stylistArea: "Ancoats",
  cover: "",
  isMobile: false,
  where: "Crown Studio, 1 High St, Manchester",
  at: Date.now() + 9 * DAY_MS,
  minutes: 300,
  pricePence: 14000,
  feePence: 260,
  tipPence: 0,
  mode: "deposit",
  cardLabel: "Visa •••• 4242",
  paymentMethodId: "pm_1",
  payments: [
    { kind: "booking", method: "card", amountPence: 3060, paidAt: Date.now() },
  ],
  refunds: [],
};

const PAST: AccountBooking = {
  ...BOOKING,
  id: "b2",
  ref: "TH-47702",
  status: "completed",
  service: "Silk press",
  customisation: "",
  at: Date.now() - 12 * DAY_MS,
  pricePence: 6500,
  feePence: 150,
  payments: [
    {
      kind: "booking",
      method: "card",
      amountPence: 6650,
      paidAt: Date.now() - 12 * DAY_MS,
    },
  ],
};

let user: UserEvent;

const renderAccount = (section: string) =>
  renderWithStore(<AccountPage />, `/account?section=${section}`, {
    signedIn: true,
  });

describe("Account bookings", () => {
  beforeEach(() => {
    user = setupUser();
    vi.mocked(fetchClientBookings).mockResolvedValue([BOOKING, PAST]);
  });

  it("the overview shows the next real booking with what's left to pay", async () => {
    renderAccount("overview");

    const card = await screen.findByRole("article", {
      name: /Knotless braids with Crown Studio/,
    });

    expect(
      within(card).getByRole("link", { name: "Manage booking" }),
    ).toHaveAttribute("href", "/manage?ref=TH-48213");

    expect(
      screen.getByRole("link", { name: /Book again with Crown Studio/ }),
    ).toHaveAttribute(
      "href",
      "/book?stylist=crown-studio&service=Silk%20press",
    );
  });

  it("past bookings open a receipt of what was paid", async () => {
    renderAccount("bookings");

    await user.click(
      await screen.findByRole("tab", { name: /Past and cancelled/ }),
    );

    await user.click(screen.getByRole("button", { name: "View receipt" }));

    const receipt = within(screen.getByRole("dialog"));

    expect(receipt.getByText(/TH-47702/)).toBeInTheDocument();
    expect(receipt.getAllByText("£66.50")).toHaveLength(2);
    expect(receipt.getByText(/· Visa •••• 4242/)).toBeInTheDocument();
  });
});
