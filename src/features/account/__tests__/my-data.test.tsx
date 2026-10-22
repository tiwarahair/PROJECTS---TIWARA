import { act, screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readAccountPhoto } from "../../../lib/account-photo";
import { fetchClientCards } from "../../../lib/client-cards";
import { supabase } from "../../../lib/supabase";
import { renderWithStore } from "../../../test/render-with-store";
import { setupUser } from "../../../test/setup-user";
import { downloadFile } from "../../../utils/download-file";
import { AccountPage } from "..";

vi.mock("../../../lib/account-photo", async (original) => ({
  ...(await original<typeof import("../../../lib/account-photo")>()),
  readAccountPhoto: vi.fn(),
}));

vi.mock("../../../lib/client-cards", async (original) => ({
  ...(await original<typeof import("../../../lib/client-cards")>()),
  fetchClientCards: vi.fn(),
}));

vi.mock("../../../utils/download-file", () => ({ downloadFile: vi.fn() }));

const MY_DATA = {
  account: { email: "nia.okafor@gmail.com" },
  profile: { first_name: "Nia", has_photo: true },
  bookings: [{ ref: "TH-48213" }],
};

let user: UserEvent;

const settle = () => act(() => vi.advanceTimersByTimeAsync(100));

describe("Account data download", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "Date",
      ],
      now: new Date("2026-10-21T12:00:00Z"),
    });

    user = setupUser();
    vi.mocked(readAccountPhoto).mockResolvedValue("data:image/jpeg;base64,AA");

    vi.mocked(fetchClientCards).mockResolvedValue([
      {
        id: "pm_123",
        brand: "visa",
        last4: "4242",
        expiry: "08/29",
        isDefault: true,
      },
    ]);

    vi.spyOn(supabase, "rpc").mockResolvedValue({
      data: MY_DATA,
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.rpc>>);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("downloads the client's data with their cards and photo", async () => {
    renderWithStore(<AccountPage />, "/account?section=privacy", {
      signedIn: true,
    });

    await user.click(screen.getByRole("button", { name: "Download" }));
    await settle();

    expect(supabase.rpc).toHaveBeenCalledWith("get_my_data");
    expect(readAccountPhoto).toHaveBeenCalledWith("test-user");

    const [name, text, type] = vi.mocked(downloadFile).mock.calls[0] ?? [];

    expect(name).toBe("tiwaras-house-data-2026-10-21.json");
    expect(type).toBe("application/json");

    expect(JSON.parse(text ?? "")).toEqual({
      account: { email: "nia.okafor@gmail.com" },
      profile: { first_name: "Nia", photo: "data:image/jpeg;base64,AA" },
      bookings: [{ ref: "TH-48213" }],
      saved_cards: [
        { brand: "visa", last4: "4242", expiry: "08/29", is_default: true },
      ],
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Your data is downloaded",
    );
  });

  it("still downloads when the cards or photo can't be read, saying the cards are missing", async () => {
    vi.mocked(fetchClientCards).mockRejectedValue(new Error("offline"));
    vi.mocked(readAccountPhoto).mockRejectedValue(new Error("gone"));

    renderWithStore(<AccountPage />, "/account?section=privacy", {
      signedIn: true,
    });

    await user.click(screen.getByRole("button", { name: "Download" }));
    await settle();

    const [, text] = vi.mocked(downloadFile).mock.calls[0] ?? [];
    const { profile, saved_cards: savedCards } = JSON.parse(text ?? "");

    expect(profile.photo).toBeNull();
    expect(savedCards).toMatch(/couldn’t be loaded/);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Your data is downloaded",
    );
  });

  it("says so when the download fails", async () => {
    vi.spyOn(supabase, "rpc").mockResolvedValue({
      data: null,
      error: { message: "offline" },
    } as unknown as Awaited<ReturnType<typeof supabase.rpc>>);

    renderWithStore(<AccountPage />, "/account?section=privacy", {
      signedIn: true,
    });

    await user.click(screen.getByRole("button", { name: "Download" }));
    await settle();

    expect(downloadFile).not.toHaveBeenCalled();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Your data couldn’t be downloaded. Try again",
    );

    expect(screen.getByRole("button", { name: "Download" })).toBeEnabled();
  });
});
