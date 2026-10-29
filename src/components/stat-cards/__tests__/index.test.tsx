import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatCards } from "..";
import { setupUser } from "../../../test/setup-user";

const cards = [{ label: "Open", value: undefined, isLoading: true }];

describe("StatCards", () => {
  it("shows the values", () => {
    render(<StatCards isWide cards={[{ label: "Open", value: 4 }]} />);

    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("numbers that didn't load show dashes and try again, not a spinner", async () => {
    const user = setupUser();
    const onRetry = vi.fn();

    render(<StatCards isWide cards={cards} onRetry={onRetry} />);

    expect(screen.getByText("—")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
