import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AddressRowSkeleton } from "../address-row-skeleton";
import { ProfileSkeleton } from "../profile-skeleton";
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

  it("ProfileSkeleton shows the card's name, area and cover while the profile loads", () => {
    const { container, getByText } = render(
      <ProfileSkeleton
        preview={{ name: "Crown & Coil", area: "Moss Side", cover: "/c.jpg" }}
      />,
    );

    expect(getByText("Crown & Coil")).toBeInTheDocument();
    expect(getByText("Moss Side")).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("src", "/c.jpg");
  });
});
