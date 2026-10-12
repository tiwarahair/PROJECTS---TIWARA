import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Link } from "react-router";
import { useFavourites } from "../../../hooks/use-favourites";
import { renderWithStore } from "../../../test/render-with-store";
import { FavHost } from "../fav-host";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

const FAVS_KEY = "tw_favs_nia.okafor@gmail.com";

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
      <a href="/account" data-tw-acct="1" aria-label="Nia Okafor">
        Nia
      </a>
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
  });

  afterEach(() => vi.useRealTimers());

  it("asks guests to log in and remembers the stylist for after log in", async () => {
    renderWithStore(<HeartPage />, "/search");
    await user.click(screen.getByRole("button", { name: "Save Amara" }));

    expect(
      screen.getByRole("dialog", { name: "Log in to save stylists" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(sessionStorage.getItem("tw_fav_pending")).toBe("amara-beauty");
    const encodedReturn = encodeURIComponent("/search?login=1");

    expect(screen.getByTestId("location")).toHaveTextContent(
      `/login?screen=cust-email&return=${encodedReturn}`,
    );
  });

  it("saves, removes and undoes a favourite for a logged-in customer", async () => {
    sessionStorage.setItem("tw_cust", "1");
    renderWithStore(<HeartPage />, "/search");
    const heart = screen.getByRole("button", { name: "Save Amara" });

    await user.click(heart);
    expect(heart).toHaveTextContent("saved");

    expect(JSON.parse(localStorage.getItem(FAVS_KEY) ?? "[]")).toEqual([
      "amara-beauty",
    ]);

    expect(screen.getByRole("status")).toHaveTextContent("Saved to favourites");

    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute(
      "href",
      "/account?section=favourites",
    );

    await user.click(heart);
    expect(heart).toHaveTextContent("not saved");

    expect(screen.getByRole("status")).toHaveTextContent(
      "Removed from favourites",
    );

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(heart).toHaveTextContent("saved");

    await flush(5000);
    await flush(260);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("saves the pending stylist after log in and confirms above the page", async () => {
    sessionStorage.setItem("tw_cust", "1");
    sessionStorage.setItem("tw_fav_pending", "amara-beauty");
    renderWithStore(<HeartPage />, "/search?login=1");
    await flush(0);

    expect(
      screen.getByRole("button", { name: "Save Amara" }),
    ).toHaveTextContent("saved");

    expect(sessionStorage.getItem("tw_fav_pending")).toBeNull();
    await flush(700);
    expect(screen.getByRole("status")).toHaveTextContent("Saved to favourites");
  });

  it("keeps ?favs= in memory and shows pinned board toasts", async () => {
    renderWithStore(<HeartPage />, "/search?favs=amara-beauty&favtoast=copied");

    expect(
      screen.getByRole("button", { name: "Save Amara" }),
    ).toHaveTextContent("saved");

    await flush(500);
    expect(screen.getByRole("status")).toHaveTextContent("Link copied");
    await flush(10000);
    expect(screen.getByRole("status")).toHaveTextContent("Link copied");
    expect(localStorage.getItem(FAVS_KEY)).toBeNull();
  });

  it("opens the account menu from [data-tw-acct], closes on Escape and logs out", async () => {
    sessionStorage.setItem("tw_cust", "1");
    renderWithStore(<HeartPage />, "/search");
    await user.click(screen.getByRole("link", { name: "Nia Okafor" }));
    const menu = screen.getByRole("menu", { name: "Nia Okafor" });

    expect(menu).toHaveTextContent("nia.okafor@gmail.com");

    expect(
      screen.getAllByRole("menuitem").map((item) => item.textContent),
    ).toEqual([
      "Bookings",
      "Favourites",
      "Account settings",
      "Help & support",
      "Log out",
    ]);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Nia Okafor" }));
    await user.click(screen.getByRole("menuitem", { name: "Log out" }));
    expect(sessionStorage.getItem("tw_cust")).toBeNull();
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
  });

  it("a router <Link> trigger opens the menu instead of navigating", async () => {
    sessionStorage.setItem("tw_cust", "1");

    renderWithStore(
      <>
        <Link to="/account" data-tw-acct="1" aria-label="Nia Okafor">
          NO
        </Link>
        <FavHost />
      </>,
      "/",
    );

    await user.click(screen.getByRole("link", { name: "Nia Okafor" }));
    await flush(50);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
  });
});
