import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  BraidsIcon,
  LocsIcon,
  MoonIcon,
  NaturalHairIcon,
  StylistIcon,
  WeaveIcon,
  WigIcon,
} from "../custom-icons";

describe("custom icons", () => {
  it.each([
    BraidsIcon,
    LocsIcon,
    MoonIcon,
    NaturalHairIcon,
    StylistIcon,
    WeaveIcon,
    WigIcon,
  ])("draws its path and takes lucide's size and stroke props", (Icon) => {
    const { container } = render(
      <Icon size={20} strokeWidth={1.7} className="tile" />,
    );

    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("width", "20");
    expect(svg).toHaveAttribute("stroke-width", "1.7");
    expect(svg).toHaveClass("tile");
    expect(svg?.querySelector("path")?.getAttribute("d")).toBeTruthy();
  });
});
