import { screen, waitFor, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteClientAddress,
  fetchClientAddresses,
  saveClientAddress,
} from "../../../lib/client-addresses";
import { renderWithStore } from "../../../test/render-with-store";
import { setupUser } from "../../../test/setup-user";
import type { SavedAddress } from "../../../types/address";
import { AccountPage } from "..";

vi.mock("../../../lib/client-addresses", () => ({
  fetchClientAddresses: vi.fn(),
  saveClientAddress: vi.fn(),
  deleteClientAddress: vi.fn(),
}));

const HOME: SavedAddress = {
  id: "a1",
  label: "Home",
  line1: "12 Dickenson Road",
  line2: "",
  town: "Manchester",
  postcode: "M14 5TQ",
  lat: 53.45,
  lng: -2.22,
  isDefault: true,
};

const WORK: SavedAddress = {
  ...HOME,
  id: "a2",
  label: "Work",
  line1: "4 Blossom Street",
  postcode: "M4 6AJ",
  isDefault: false,
};

let user: UserEvent;

const renderAddresses = async () => {
  renderWithStore(<AccountPage />, "/account?section=addresses", {
    signedIn: true,
  });

  await screen.findByText("Home");
};

const expectToast = (message: string) =>
  waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(message));

describe("Account saved addresses", () => {
  beforeEach(() => {
    user = setupUser();
    localStorage.clear();
    vi.mocked(fetchClientAddresses).mockReset().mockResolvedValue([HOME, WORK]);
    vi.mocked(saveClientAddress).mockReset().mockResolvedValue("a3");
    vi.mocked(deleteClientAddress).mockReset().mockResolvedValue(null);
  });

  it("shows the account's addresses with the default marked", async () => {
    await renderAddresses();

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Work")).toBeInTheDocument();
    expect(screen.getAllByText("Default")).toHaveLength(1);
  });

  it("saves a new address to the account", async () => {
    await renderAddresses();
    await user.click(screen.getByRole("button", { name: "Add an address" }));
    await user.type(screen.getByPlaceholderText("e.g. Home"), "Mum’s");

    await user.click(
      screen.getByRole("button", { name: "Enter address manually" }),
    );

    await user.type(
      screen.getByLabelText("Address line 1"),
      "9 Wilbraham Road",
    );

    await user.type(screen.getByLabelText("Town/city"), "Manchester");
    await user.type(screen.getByLabelText("Postcode"), "m16 8gq");
    await user.click(screen.getByRole("button", { name: "Save address" }));
    await expectToast("Address saved");

    expect(saveClientAddress).toHaveBeenCalledWith({
      id: null,
      address: expect.objectContaining({
        label: "Mum’s",
        line1: "9 Wilbraham Road",
        town: "Manchester",
        postcode: "M16 8GQ",
        isDefault: false,
      }),
    });
  });

  it("makes another address the default and removes one", async () => {
    await renderAddresses();

    await user.click(
      screen.getByRole("button", { name: "Options for address 2" }),
    );

    await user.click(screen.getByRole("menuitem", { name: "Make default" }));
    await expectToast("Work is now your default address");

    expect(saveClientAddress).toHaveBeenCalledWith({
      id: "a2",
      address: expect.objectContaining({ label: "Work", isDefault: true }),
    });

    await user.click(
      screen.getByRole("button", { name: "Options for address 1" }),
    );

    await user.click(screen.getByRole("menuitem", { name: "Remove" }));

    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Remove",
      }),
    );

    await expectToast("Address removed");
    expect(deleteClientAddress).toHaveBeenCalledWith("a1");
  });

  it("says when the account already has 10 addresses", async () => {
    vi.mocked(saveClientAddress).mockRejectedValue({
      message: "too_many_addresses",
    });

    await renderAddresses();

    await user.click(
      screen.getByRole("button", { name: "Options for address 2" }),
    );

    await user.click(screen.getByRole("menuitem", { name: "Make default" }));
    await expectToast("You can save up to 10 addresses");
  });

  it("an address that couldn't be moved stays on the device for next time", async () => {
    vi.mocked(saveClientAddress)
      .mockResolvedValueOnce("a3")
      .mockRejectedValueOnce(new Error("offline"));

    localStorage.setItem(
      "tw_addrs",
      JSON.stringify([
        { ...WORK, id: "old-1" },
        { ...HOME, id: "old-2" },
      ]),
    );

    await renderAddresses();

    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem("tw_addrs") ?? "[]")).toEqual([
        { ...HOME, id: "old-2" },
      ]),
    );
  });

  it("a device address the account can't hold is dropped and the rest still move", async () => {
    vi.mocked(saveClientAddress)
      .mockRejectedValueOnce(new Error("invalid_address"))
      .mockResolvedValueOnce("a3");

    localStorage.setItem(
      "tw_addrs",
      JSON.stringify([
        { ...WORK, id: "old-1", postcode: "M1" },
        { ...HOME, id: "old-2" },
      ]),
    );

    await renderAddresses();
    await waitFor(() => expect(localStorage.getItem("tw_addrs")).toBeNull());
    expect(saveClientAddress).toHaveBeenCalledTimes(2);
  });

  it("moves addresses saved on this device into the account once", async () => {
    localStorage.setItem("tw_addrs", JSON.stringify([{ ...WORK, id: "old" }]));
    await renderAddresses();
    await waitFor(() => expect(localStorage.getItem("tw_addrs")).toBeNull());
    expect(saveClientAddress).toHaveBeenCalledTimes(1);

    expect(saveClientAddress).toHaveBeenCalledWith({
      id: null,
      address: expect.objectContaining({ label: "Work" }),
    });
  });
});
