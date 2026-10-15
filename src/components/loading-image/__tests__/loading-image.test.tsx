import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingImage } from "../loading-image";

describe("LoadingImage", () => {
  it("is marked loaded once the photo arrives", () => {
    render(<LoadingImage src="/photo.jpg" alt="Photo" />);
    const image = screen.getByRole("img", { name: "Photo" });

    expect(image).not.toHaveAttribute("data-loaded");

    fireEvent.load(image);

    expect(image).toHaveAttribute("data-loaded");
  });

  it("stops loading when the photo fails", () => {
    render(<LoadingImage src="/missing.jpg" alt="Photo" />);
    const image = screen.getByRole("img", { name: "Photo" });

    fireEvent.error(image);

    expect(image).toHaveAttribute("data-loaded");
  });
});
