import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithStore } from "../../../test/render-with-store";
import { EmailChangeNoticePage } from "..";

describe("EmailChangeNoticePage", () => {
  it("renders the notice with the 'This wasn't me' link to help", () => {
    renderWithStore(<EmailChangeNoticePage />, "/email/email-change-notice");

    expect(
      screen.getByRole("heading", { name: "Your email was changed" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "This wasn't me" }),
    ).toHaveAttribute("href", "/help");
  });
});
