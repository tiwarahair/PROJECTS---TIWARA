import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HoldBar } from "../hold-bar";

describe("HoldBar", () => {
  it("counts down the held time", () => {
    render(
      <HoldBar
        variant="card"
        time="10:30"
        leftMs={125000}
        isConfirming={false}
      />,
    );

    expect(screen.getByRole("timer")).toHaveTextContent(
      "We're holding 10:30 for you · 2:05",
    );
  });

  it("swaps the countdown for a confirming note once the client pays", () => {
    render(<HoldBar variant="card" time="10:30" leftMs={5000} isConfirming />);

    expect(screen.queryByRole("timer")).not.toBeInTheDocument();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Confirming your booking…",
    );
  });
});
