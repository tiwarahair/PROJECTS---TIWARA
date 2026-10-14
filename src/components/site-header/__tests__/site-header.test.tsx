import { screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { renderWithStore } from "../../../test/render-with-store";
import { setupUser } from "../../../test/setup-user";
import { SiteHeader } from "../site-header";

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

describe("SiteHeader", () => {
  it("shows guests the given login link and a menu button", () => {
    renderWithStore(<SiteHeader loginHref="/login?return=%2Fhelp" />);

    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login?return=%2Fhelp",
    );

    expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();
  });

  it("signed in, shows the favourites heart and the account menu instead of the menu button", async () => {
    renderWithStore(<SiteHeader />, "/", { signedIn: true });

    expect(
      screen.getByRole("link", { name: "Favourites" }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "Menu" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Account" }));

    expect(
      screen.getByRole("menu", { name: "Nia Okafor" }),
    ).toBeInTheDocument();
  });

  it("shows the given initials", () => {
    renderWithStore(<SiteHeader initials="AB" />, "/", { signedIn: true });

    expect(screen.getByRole("button", { name: "Account" })).toHaveTextContent(
      "AB",
    );
  });
});
