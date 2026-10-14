import { screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../test/render-with-store";
import { setupUser } from "../../../test/setup-user";
import { ACCOUNT_TAB_EVENT, AccountAvatar, SiteMenu } from "../site-menu";

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

const getItemLabels = () =>
  screen.getAllByRole("menuitem").map((item) => item.textContent);

describe("SiteMenu", () => {
  it("signed in: name and email, site links, account sections, closes on Escape and logs out", async () => {
    const { store } = renderWithStore(
      <SiteMenu isSignedIn>
        <AccountAvatar initials="NO" />
      </SiteMenu>,
      "/search",
      { signedIn: true },
    );

    await user.click(screen.getByRole("button", { name: "Account" }));

    expect(screen.getByRole("menu", { name: "Nia Okafor" })).toHaveTextContent(
      "nia.okafor@gmail.com",
    );

    expect(getItemLabels()).toEqual([
      "Find a stylist",
      "Services",
      "Bookings",
      "Favourites",
      "Account settings",
      "Help & support",
      "Log out",
    ]);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Account" }));
    await user.click(screen.getByRole("menuitem", { name: "Log out" }));
    expect(store.getState().session.loggedIn).toBe(false);
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
  });

  it("for guests: site links, the given login link and Help & support", async () => {
    renderWithStore(
      <SiteMenu isSignedIn={false} loginHref="/login?return=%2Fhelp">
        ☰
      </SiteMenu>,
    );

    await user.click(screen.getByRole("button", { name: "Menu" }));

    expect(getItemLabels()).toEqual([
      "Find a stylist",
      "Services",
      "Log in",
      "Help & support",
    ]);

    expect(screen.getByRole("menuitem", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login?return=%2Fhelp",
    );
  });

  it("on the account page, a section switches in place instead of navigating", async () => {
    const onTab = vi.fn();

    window.addEventListener(ACCOUNT_TAB_EVENT, onTab);

    renderWithStore(
      <SiteMenu isSignedIn>
        <AccountAvatar initials="NO" />
      </SiteMenu>,
      "/account?section=overview",
      { signedIn: true },
    );

    await user.click(screen.getByRole("button", { name: "Account" }));
    await user.click(screen.getByRole("menuitem", { name: "Bookings" }));

    expect((onTab.mock.calls[0]?.[0] as CustomEvent).detail).toBe("bookings");

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/account?section=overview",
    );

    window.removeEventListener(ACCOUNT_TAB_EVENT, onTab);
  });
});
