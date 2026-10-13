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
});
