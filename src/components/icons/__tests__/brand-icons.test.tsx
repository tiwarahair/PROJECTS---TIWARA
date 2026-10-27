import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  AppleLogo,
  GoogleLogo,
  OutlookLogo,
  SOCIAL_ICONS,
  SocialIcon,
} from "../brand-icons";

describe("brand icons", () => {
  it.each(Object.entries(SOCIAL_ICONS))(
    "draws the %s mark at the given size",
    (_name, icon) => {
      const { container } = render(<SocialIcon icon={icon} size={18} />);
      const svg = container.querySelector("svg");

      expect(svg).toHaveAttribute("width", "18");
      expect(svg).toHaveAttribute("height", "18");
      expect(svg?.querySelector("path")?.getAttribute("d")).toBeTruthy();
    },
  );

  it("shows the Google and Apple marks at the given size", () => {
    const { container } = render(
      <>
        <GoogleLogo size={17} />
        <AppleLogo size={19} />
      </>,
    );

    expect(container.querySelector("img")).toHaveAttribute("width", "17");
    expect(container.querySelector("svg")).toHaveAttribute("width", "19");
  });

  it("shows the Outlook mark at the given size", () => {
    const { container } = render(<OutlookLogo size={16} />);

    expect(container.querySelector("img")).toHaveAttribute("width", "16");
  });
});
