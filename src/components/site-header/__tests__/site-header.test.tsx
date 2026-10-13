import { screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../test/render-with-store";
import { setupUser } from "../../../test/setup-user";
import { SiteHeader } from "../site-header";

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

describe("SiteHeader", () => {
  it("shows Log in to visitors", () => {
    renderWithStore(<SiteHeader />);

    expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
  });

  it("shows the account button and opens the menu when signed in", async () => {
    renderWithStore(<SiteHeader />, "/", { signedIn: true });
    expect(screen.getByRole("link", { name: "Account" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Menu" }));

    expect(
      screen.getAllByRole("link", { name: "Find a stylist" }),
    ).toHaveLength(2);
  });

  it("sends guests to the given login link", () => {
    renderWithStore(<SiteHeader loginHref="/login?return=%2Fhelp" />);

    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login?return=%2Fhelp",
    );
  });

  it("closes the menu on Escape", async () => {
    renderWithStore(<SiteHeader />);
    await user.click(screen.getByRole("button", { name: "Menu" }));

    await user.keyboard("{Escape}");

    expect(
      screen.getAllByRole("link", { name: "Find a stylist" }),
    ).toHaveLength(1);
  });

  it("with an account menu, lists the account sections and opens them in place", async () => {
    const onSection = vi.fn();

    renderWithStore(
      <SiteHeader
        accountMenu={{ label: "Nia Okafor", initials: "NO", onSection }}
      />,
      "/account",
      { signedIn: true },
    );

    expect(
      screen.getByRole("button", { name: "Nia Okafor" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Menu" }));

    await user.click(screen.getByRole("link", { name: "Bookings" }));

    expect(onSection).toHaveBeenCalledWith("bookings");
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });
});
