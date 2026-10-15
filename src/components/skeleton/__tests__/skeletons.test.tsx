import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AddressRowSkeleton } from "../address-row-skeleton";
import { StudioSkeleton } from "../studio-skeleton";

describe("skeletons", () => {
  it("AddressRowSkeleton renders hidden from screen readers", () => {
    const { container } = render(<AddressRowSkeleton />);

    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("StudioSkeleton renders hidden from screen readers", () => {
    const { container } = render(<StudioSkeleton />);

    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });
});
