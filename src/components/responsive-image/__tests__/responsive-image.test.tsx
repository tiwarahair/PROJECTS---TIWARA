import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResponsiveImage } from "../responsive-image";

describe("ResponsiveImage", () => {
  it("offers AVIF, then WebP, then JPEG with the same sizes", () => {
    const { container } = render(
      <ResponsiveImage src="site/hero.jpg" sizes="100vw" alt="Hero" />,
    );

    const sources = [...container.querySelectorAll("picture > source")];

    expect(sources.map((source) => source.getAttribute("type"))).toEqual([
      "image/avif",
      "image/webp",
    ]);

    expect(sources[0]).toHaveAttribute("sizes", "100vw");

    const image = screen.getByRole("img", { name: "Hero" });

    expect(image).toHaveAttribute("srcset", expect.stringContaining("1080w"));
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveAttribute("width", "1536");
  });

  it("is a plain image for anything without copies", () => {
    const { container } = render(
      <ResponsiveImage src="data:image/png;base64,abc" sizes="36px" alt="" />,
    );

    expect(container.querySelector("picture")).toBeNull();

    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "data:image/png;base64,abc",
    );
  });
});
