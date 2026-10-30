import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithStore } from "../../../test/render-with-store";
import { MarketingFooter } from "..";

describe("MarketingFooter", () => {
  it("on Home, section links stay in-page anchors", () => {
    renderWithStore(<MarketingFooter />, "/");

    expect(screen.getByRole("link", { name: "FAQs" })).toHaveAttribute(
      "href",
      "#faq",
    );
  });

  it("on other pages, section links go back to Home and page links open the pages", () => {
    renderWithStore(<MarketingFooter />, "/about");

    expect(screen.getByRole("link", { name: "FAQs" })).toHaveAttribute(
      "href",
      "/#faq",
    );

    expect(
      screen.getByRole("link", { name: "Privacy policy" }),
    ).toHaveAttribute("href", "/#faq");

    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "href",
      "/about",
    );

    expect(screen.getByRole("link", { name: "Why join" })).toHaveAttribute(
      "href",
      "/for-stylists",
    );
  });
});
