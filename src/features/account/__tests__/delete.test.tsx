import { screen, waitFor, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteClientAccount,
  fetchDeletionBlockers,
} from "../../../lib/client-account";
import { renderWithStore } from "../../../test/render-with-store";
import { setupUser } from "../../../test/setup-user";
import { AccountPage } from "..";

vi.mock("../../../lib/client-account", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/client-account")>()),
  fetchDeletionBlockers: vi.fn(),
  deleteClientAccount: vi.fn(),
}));

const NOTHING_IN_THE_WAY = {
  bookings: [],
  owesMoney: false,
  hasBusiness: false,
};

let user: UserEvent;

const openDelete = async () => {
  renderWithStore(<AccountPage />, "/account?section=privacy", {
    signedIn: true,
  });

  await user.click(screen.getByRole("button", { name: "Delete account" }));

  return within(await screen.findByRole("dialog"));
};

describe("Account delete", () => {
  beforeEach(() => {
    user = setupUser();
    localStorage.clear();

    vi.mocked(fetchDeletionBlockers)
      .mockReset()
      .mockResolvedValue(NOTHING_IN_THE_WAY);

    vi.mocked(deleteClientAccount)
      .mockReset()
      .mockResolvedValue({ deleted: true });
  });

  it("deletes the account once DELETE is typed, and clears what was on this device", async () => {
    localStorage.setItem("tw_favs_test-user", '["crown-studio"]');
    const dialog = await openDelete();

    const remove = await dialog.findByRole("button", {
      name: "Delete account",
    });

    expect(remove).toBeDisabled();
    await user.type(dialog.getByLabelText("Type DELETE to confirm"), "delete");
    await user.click(remove);

    expect(
      await screen.findByRole("heading", {
        name: "Your account has been deleted",
      }),
    ).toBeInTheDocument();

    expect(deleteClientAccount).toHaveBeenCalled();
    expect(localStorage.getItem("tw_favs_test-user")).toBeNull();
  });

  it("lists the upcoming bookings in the way, with a link to manage each", async () => {
    vi.mocked(fetchDeletionBlockers).mockResolvedValue({
      bookings: [
        {
          ref: "TH-48213",
          stylistName: "Crown Studio",
          startsAt: "2026-11-02T10:30:00Z",
        },
      ],
      owesMoney: true,
      hasBusiness: false,
    });

    const dialog = await openDelete();

    expect(await dialog.findByText(/Crown Studio/)).toBeInTheDocument();

    expect(
      dialog.getByRole("link", { name: "Manage booking" }),
    ).toHaveAttribute("href", "/manage?ref=TH-48213");

    expect(dialog.getByText(/fee or balance to pay/)).toBeInTheDocument();

    expect(
      dialog.queryByLabelText("Type DELETE to confirm"),
    ).not.toBeInTheDocument();
  });

  it("if something gets in the way meanwhile, the server refuses and the dialog says why", async () => {
    vi.mocked(deleteClientAccount).mockRejectedValue(new Error("blocked"));
    const dialog = await openDelete();

    await user.type(
      await dialog.findByLabelText("Type DELETE to confirm"),
      "delete",
    );

    vi.mocked(fetchDeletionBlockers).mockResolvedValue({
      ...NOTHING_IN_THE_WAY,
      owesMoney: true,
    });

    await user.click(dialog.getByRole("button", { name: "Delete account" }));

    await waitFor(() =>
      expect(screen.getByText(/fee or balance to pay/)).toBeInTheDocument(),
    );
  });
});
