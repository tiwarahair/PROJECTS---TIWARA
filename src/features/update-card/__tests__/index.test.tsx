import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateCardPage } from "..";

const saveUpdate = vi.fn();

vi.mock("../../../components/link-payment", () => ({
  CardSetup: ({ onPaid }: { onPaid: () => void }) => (
    <button onClick={onPaid}>Save new card</button>
  ),
}));

vi.mock("../../../stores/api-slice", () => ({
  useGetCardUpdateQuery: () => ({
    currentData: {
      state: "open",
      ref: "TW-1",
      service_name: "Silk press",
      stylist_name: "Ada",
      stylist_slug: "ada",
      starts_at: "2026-11-20T10:00:00Z",
      card_label: "Visa ending 4242",
      mode: "card",
    },
    isFetching: false,
  }),
  useStartCardUpdateMutation: () => [vi.fn()],
  useSaveCardUpdateMutation: () => [saveUpdate],
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/card?token=abc"]}>
      <UpdateCardPage />
    </MemoryRouter>,
  );

describe("UpdateCardPage", () => {
  beforeEach(() => saveUpdate.mockReset());

  it("says the card is updated once it's saved", async () => {
    saveUpdate.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    renderPage();

    await userEvent.click(
      screen.getByRole("button", { name: "Save new card" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Your card is updated" }),
    ).toBeInTheDocument();
  });

  it("doesn't say it's updated when saving keeps failing", async () => {
    saveUpdate.mockReturnValue({
      unwrap: () => Promise.reject(new Error("offline")),
    });

    renderPage();

    await userEvent.click(
      screen.getByRole("button", { name: "Save new card" }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "We’re still saving your card",
      }),
    ).toBeInTheDocument();

    expect(saveUpdate).toHaveBeenCalledTimes(3);
  });
});
