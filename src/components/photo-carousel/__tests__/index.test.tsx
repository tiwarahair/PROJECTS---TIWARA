import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { setupUser } from "../../../test/setup-user";
import { PhotoCarousel } from "..";

describe("PhotoCarousel", () => {
  it("shows every photo with the label, and the arrows step the track", async () => {
    const user = setupUser();
    const scrollTo = vi.fn();

    Element.prototype.scrollTo = scrollTo;

    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(100);

    render(
      <PhotoCarousel
        photos={["one.jpg", "two.jpg", "three.jpg"]}
        label="Knotless braids"
        sizes="400px"
      />,
    );

    const carousel = screen.getByRole("group", {
      name: "Knotless braids photos",
    });

    expect(within(carousel).getAllByRole("img")).toHaveLength(3);
    expect(within(carousel).getByText("Knotless braids")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous photo" }));

    expect(scrollTo).toHaveBeenLastCalledWith(
      expect.objectContaining({ left: 200 }),
    );

    await user.click(screen.getByRole("button", { name: "Next photo" }));

    expect(scrollTo).toHaveBeenLastCalledWith(
      expect.objectContaining({ left: 100 }),
    );

    vi.restoreAllMocks();
  });

  it("a single photo has no arrows", () => {
    render(<PhotoCarousel photos={["one.jpg"]} sizes="400px" />);

    expect(
      screen.queryByRole("button", { name: "Next photo" }),
    ).not.toBeInTheDocument();
  });
});
