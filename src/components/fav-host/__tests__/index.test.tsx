import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFavourites } from "../../../hooks/use-favourites";
import { fetchFavourites, writeFavourite } from "../../../lib/favourites";
import { renderWithStore } from "../../../test/render-with-store";
import { FavHost } from "..";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

vi.mock("../../../lib/favourites", () => ({
  fetchFavourites: vi.fn(),
  writeFavourite: vi.fn(),
}));

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

const HeartPage = () => {
  const { isFavourite, toggleFavourite } = useFavourites();

  return (
    <>
      <button
        type="button"
        aria-label="Save Amara"
        onClick={(event) => toggleFavourite("amara-beauty", event)}
      >
        {isFavourite("amara-beauty") ? "saved" : "not saved"}
      </button>
      <FavHost />
    </>
  );
};

/** Lets the double requestAnimationFrame entry and any timers settle. */
const flush = async (ms = 0) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

describe("FavHost", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    localStorage.clear();
    vi.mocked(fetchFavourites).mockResolvedValue([]);
    vi.mocked(writeFavourite).mockResolvedValue();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("asks guests to log in and remembers the stylist for after log in", async () => {
    renderWithStore(<HeartPage />, "/search");
    await user.click(screen.getByRole("button", { name: "Save Amara" }));

    expect(
      screen.getByRole("dialog", { name: "Log in to save stylists" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(sessionStorage.getItem("tw_fav_pending")).toBe("amara-beauty");
    const encodedReturn = encodeURIComponent("/search");

    expect(screen.getByTestId("location")).toHaveTextContent(
      `/login?screen=cust-email&return=${encodedReturn}`,
    );
  });

  it("saves, removes and undoes a favourite for a logged-in customer", async () => {
    renderWithStore(<HeartPage />, "/search", { signedIn: true });
    const heart = screen.getByRole("button", { name: "Save Amara" });

    await flush(0);
    await user.click(heart);
    expect(heart).toHaveTextContent(/^saved$/);
    expect(writeFavourite).toHaveBeenCalledWith("amara-beauty", true);

    expect(screen.getByRole("status")).toHaveTextContent("Saved to favourites");

    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute(
      "href",
      "/account?section=favourites",
    );

    await user.click(heart);
    expect(heart).toHaveTextContent("not saved");
    expect(writeFavourite).toHaveBeenLastCalledWith("amara-beauty", false);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Removed from favourites",
    );

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(heart).toHaveTextContent(/^saved$/);
    expect(writeFavourite).toHaveBeenLastCalledWith("amara-beauty", true);

    await flush(5000);
    await flush(260);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("saves the pending stylist after log in and confirms above the page", async () => {
    sessionStorage.setItem("tw_fav_pending", "amara-beauty");
    renderWithStore(<HeartPage />, "/search", { signedIn: true });
    await flush(0);

    expect(
      screen.getByRole("button", { name: "Save Amara" }),
    ).toHaveTextContent(/^saved$/);

    expect(writeFavourite).toHaveBeenCalledWith("amara-beauty", true);
    expect(sessionStorage.getItem("tw_fav_pending")).toBeNull();
    await flush(700);
    expect(screen.getByRole("status")).toHaveTextContent("Saved to favourites");
  });

  it("shows the account's favourites", async () => {
    vi.mocked(fetchFavourites).mockResolvedValue(["amara-beauty"]);
    renderWithStore(<HeartPage />, "/search", { signedIn: true });
    await flush(0);

    expect(
      screen.getByRole("button", { name: "Save Amara" }),
    ).toHaveTextContent(/^saved$/);
  });

  it("turns the heart back and says so when the save fails", async () => {
    vi.mocked(writeFavourite).mockRejectedValue(new Error("offline"));
    renderWithStore(<HeartPage />, "/search", { signedIn: true });
    await flush(0);
    const heart = screen.getByRole("button", { name: "Save Amara" });

    await user.click(heart);
    await flush(0);

    expect(heart).toHaveTextContent("not saved");

    expect(screen.getByRole("status")).toHaveTextContent(
      "Your favourites couldn’t be saved. Try again",
    );
  });

  it("keeps a heart tapped while the account's favourites are still loading", async () => {
    let finishLoading: (ids: string[]) => void = () => {};

    vi.mocked(fetchFavourites).mockReturnValue(
      new Promise((resolve) => {
        finishLoading = resolve;
      }),
    );

    renderWithStore(<HeartPage />, "/search", { signedIn: true });
    const heart = screen.getByRole("button", { name: "Save Amara" });

    await user.click(heart);
    await act(async () => finishLoading([]));
    await flush(0);

    expect(heart).toHaveTextContent(/^saved$/);
  });

  it("sends a heart's quick taps to the server one after another", async () => {
    let finishFirst: () => void = () => {};

    vi.mocked(writeFavourite).mockReturnValueOnce(
      new Promise((resolve) => {
        finishFirst = resolve;
      }),
    );

    renderWithStore(<HeartPage />, "/search", { signedIn: true });
    await flush(0);
    const heart = screen.getByRole("button", { name: "Save Amara" });

    await user.click(heart);
    await user.click(heart);

    expect(writeFavourite).toHaveBeenCalledTimes(1);

    await act(async () => finishFirst());
    await flush(0);

    expect(vi.mocked(writeFavourite).mock.calls).toEqual([
      ["amara-beauty", true],
      ["amara-beauty", false],
    ]);

    expect(heart).toHaveTextContent(/^not saved$/);
  });
});
