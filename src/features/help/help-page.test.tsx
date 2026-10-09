import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { renderWithStore } from "../../test/render-with-store";
import { HelpPage } from "./help-page";

describe("HelpPage", () => {
  beforeEach(() => sessionStorage.clear());

  it("renders the three FAQs closed and the contact email", () => {
    renderWithStore(<HelpPage />, "/help");
    expect(
      screen.getByRole("heading", { level: 1, name: "Help & support" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
    expect(
      screen.getByRole("link", { name: "help@tiwarashouse.co.uk" }),
    ).toHaveAttribute("href", "mailto:help@tiwarashouse.co.uk");
  });

  it("opens one FAQ at a time", () => {
    renderWithStore(<HelpPage />, "/help");
    const first = screen.getByRole("button", { name: "How do deposits work?" });
    const second = screen.getByRole("button", {
      name: "What if I need to cancel or reschedule?",
    });
    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(second);
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(second).toHaveAttribute("aria-expanded", "true");
  });

  it("?booking= names the booking and fills the email subject", () => {
    renderWithStore(<HelpPage />, "/help?booking=TH-48213");
    expect(screen.getByText("TH-48213")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "help@tiwarashouse.co.uk" }),
    ).toHaveAttribute(
      "href",
      "mailto:help@tiwarashouse.co.uk?subject=Help%20with%20booking%20TH-48213",
    );
  });
});
