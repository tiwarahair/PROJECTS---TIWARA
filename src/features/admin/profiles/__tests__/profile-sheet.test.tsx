import { screen, waitFor } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchProfile,
  markProfileChecked,
  saveProfileNote,
  suspendStylist,
} from "../../../../lib/admin-api";
import { renderWithStore } from "../../../../test/render-with-store";
import { setupUser } from "../../../../test/setup-user";
import { ProfileSheet } from "../profile-sheet";
import { PROFILE } from "./fixtures";

vi.mock("../../../../lib/admin-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../lib/admin-api")>()),
  fetchProfile: vi.fn(),
  markProfileChecked: vi.fn(),
  saveProfileNote: vi.fn(),
  suspendStylist: vi.fn(),
}));

let user: UserEvent;
const onClose = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  user = setupUser();
  onClose.mockReset();
  vi.mocked(fetchProfile).mockResolvedValue(PROFILE);
  vi.mocked(markProfileChecked).mockResolvedValue(null);
  vi.mocked(suspendStylist).mockResolvedValue(null);
  vi.mocked(saveProfileNote).mockResolvedValue(null);
});

const renderSheet = () =>
  renderWithStore(<ProfileSheet stylistId="stylist-1" onClose={onClose} />);

const ClosingSheet = () => {
  const [isOpen, setOpen] = useState(true);

  return isOpen ? (
    <ProfileSheet stylistId="stylist-1" onClose={() => setOpen(false)} />
  ) : (
    <button type="button" onClick={() => setOpen(true)}>
      Open again
    </button>
  );
};

describe("ProfileSheet", () => {
  it("shows the checks and links to Stripe for the bank details", async () => {
    renderSheet();

    expect(
      await screen.findByText("Same phone as Braids by Ifeoma"),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Check by hand in Stripe" }),
    ).toHaveAttribute(
      "href",
      expect.stringContaining("connect/accounts/acct_123"),
    );
  });

  it("needs a note before marking as checked", async () => {
    renderSheet();

    await user.click(
      await screen.findByRole("button", { name: "Mark as checked" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Add a note");
    expect(markProfileChecked).not.toHaveBeenCalled();

    await user.type(
      screen.getByRole("textbox", { name: "Notes" }),
      "Photos match Instagram",
    );

    await user.click(screen.getByRole("button", { name: "Mark as checked" }));

    await waitFor(() =>
      expect(markProfileChecked).toHaveBeenCalledWith({
        stylistId: "stylist-1",
        note: "Photos match Instagram",
      }),
    );

    expect(onClose).toHaveBeenCalled();
  });

  it("explains a suspension and needs a reason", async () => {
    renderSheet();

    await user.click(
      await screen.findByRole("button", { name: "Suspend stylist" }),
    );

    expect(
      screen.getByText("Existing bookings carry on as booked."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Suspend stylist" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Add a reason");

    await user.type(
      screen.getByRole("textbox", { name: /Reason/ }),
      "Same phone as another account",
    );

    await user.click(screen.getByRole("button", { name: "Suspend stylist" }));

    await waitFor(() =>
      expect(suspendStylist).toHaveBeenCalledWith({
        stylistId: "stylist-1",
        note: "Same phone as another account",
      }),
    );
  });

  it("can be checked again when a new flag appears after a check", async () => {
    vi.mocked(fetchProfile).mockResolvedValue({
      ...PROFILE,
      checked_at: "2026-10-20T09:00:00Z",
      new_flags: [],
    });

    const { unmount } = renderSheet();

    expect(await screen.findByText(/^Checked/)).toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "Mark as checked" }),
    ).not.toBeInTheDocument();

    unmount();

    vi.mocked(fetchProfile).mockResolvedValue({
      ...PROFILE,
      checked_at: "2026-10-20T09:00:00Z",
      new_flags: ["contact"],
    });

    renderSheet();

    expect(
      await screen.findByRole("button", { name: "Mark as checked" }),
    ).toBeInTheDocument();
  });

  it("a profile that doesn't load offers to try again", async () => {
    vi.mocked(fetchProfile)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(PROFILE);

    renderSheet();

    await user.click(await screen.findByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Plaits & Petals")).toBeInTheDocument();
  });

  it("says when the business has closed", async () => {
    vi.mocked(fetchProfile).mockResolvedValue(null);
    renderSheet();

    expect(
      await screen.findByText(/This business has closed/),
    ).toBeInTheDocument();
  });

  it("saves a changed note on a checked profile, and shows it when opened again", async () => {
    vi.mocked(fetchProfile).mockResolvedValue({
      ...PROFILE,
      checked_at: "2026-10-20T09:00:00Z",
      new_flags: [],
    });

    renderWithStore(<ClosingSheet />);

    await user.type(
      await screen.findByRole("textbox", { name: "Notes" }),
      "Asked for photo ID",
    );

    await user.click(screen.getByRole("button", { name: "Save note" }));

    await waitFor(() =>
      expect(saveProfileNote).toHaveBeenCalledWith({
        stylistId: "stylist-1",
        note: "Asked for photo ID",
      }),
    );

    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(await screen.findByRole("button", { name: "Open again" }));

    expect(await screen.findByRole("textbox", { name: "Notes" })).toHaveValue(
      "Asked for photo ID",
    );
  });

  it("asks before closing with an unsaved note, and doesn't save it", async () => {
    renderWithStore(<ClosingSheet />);

    await user.type(
      await screen.findByRole("textbox", { name: "Notes" }),
      "Half a thought",
    );

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(await screen.findByText("Discard changes?")).toBeInTheDocument();
    expect(saveProfileNote).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Keep editing" }));

    expect(screen.getByRole("textbox", { name: "Notes" })).toHaveValue(
      "Half a thought",
    );

    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(await screen.findByRole("button", { name: "Discard" }));

    expect(
      await screen.findByRole("button", { name: "Open again" }),
    ).toBeInTheDocument();
  });

  it("asks before closing with a half-written suspension reason", async () => {
    renderSheet();

    await user.click(
      await screen.findByRole("button", { name: "Suspend stylist" }),
    );

    await user.type(screen.getByRole("textbox", { name: /Reason/ }), "Same");
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(await screen.findByText("Discard changes?")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
