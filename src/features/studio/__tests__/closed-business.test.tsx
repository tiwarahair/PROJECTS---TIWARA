import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithStore } from "../../../test/render-with-store";
import { ClosedBusiness } from "../closed-business";

describe("ClosedBusiness", () => {
  it("shows the last day to reopen, 15 days after closing", () => {
    renderWithStore(<ClosedBusiness closedAt="2026-10-13T12:00:00Z" />);

    expect(
      screen.getByRole("heading", { name: "Your business is closed" }),
    ).toBeInTheDocument();

    expect(screen.getByText("Reopen by 28 Oct")).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Reopen business" }),
    ).toBeEnabled();
  });
});
