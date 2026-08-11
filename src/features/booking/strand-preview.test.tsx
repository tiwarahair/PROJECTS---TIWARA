import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StrandPreview } from "./strand-preview";

const renderPreview = (
  props: Partial<Parameters<typeof StrandPreview>[0]> = {},
) =>
  render(
    <StrandPreview
      serviceId="braids"
      styleId="cornrows"
      colourId="1B"
      lengthId="shoulder"
      stylistName="Tiwara's House"
      styleName="Cornrows"
      stylePrice="from £60"
      groups={["length", "colour", "size"]}
      chosenGroups={[]}
      onCustomiseStep={false}
      {...props}
    />,
  );

const segments = (container: HTMLElement) =>
  container.querySelectorAll(".bp-lbar-item");

const activeSegments = (container: HTMLElement) =>
  container.querySelectorAll(".bp-lbar-item.active");

describe("StrandPreview", () => {
  it("renders without crashing", () => {
    renderPreview();
    expect(screen.getByText("Cornrows")).toBeInTheDocument();
  });

  describe("the progress bar", () => {
    it("stays hidden away from the customise step", () => {
      const { container } = renderPreview({ onCustomiseStep: false });
      expect(segments(container)).toHaveLength(0);
    });

    it("has one segment per customisable group", () => {
      const { container } = renderPreview({
        onCustomiseStep: true,
        groups: ["length", "colour", "size"],
      });
      expect(segments(container)).toHaveLength(3);

      const locs = renderPreview({
        onCustomiseStep: true,
        groups: ["length", "size"],
      });
      expect(segments(locs.container)).toHaveLength(2);
    });

    it("starts empty and fills one segment per group chosen", () => {
      const { container: none } = renderPreview({ onCustomiseStep: true });
      expect(activeSegments(none)).toHaveLength(0);

      const { container: one } = renderPreview({
        onCustomiseStep: true,
        chosenGroups: ["colour"],
      });
      expect(activeSegments(one)).toHaveLength(1);

      const { container: all } = renderPreview({
        onCustomiseStep: true,
        chosenGroups: ["colour", "length", "size"],
      });
      expect(activeSegments(all)).toHaveLength(3);
    });

    it("does not render for a service with nothing to customise", () => {
      const { container } = renderPreview({
        onCustomiseStep: true,
        groups: [],
      });
      expect(segments(container)).toHaveLength(0);
    });
  });

  describe("the meta caption", () => {
    it("shows the salon name on its own until the customise step", () => {
      const { container } = renderPreview({ onCustomiseStep: false });

      expect(screen.getByText(/Tiwara's House/)).toBeInTheDocument();
      // The look details stay in the DOM but collapsed, so they can animate in.
      expect(container.querySelector(".bp-img-meta-look.shown")).toBeNull();
    });

    it("reveals the look details on the customise step", () => {
      const { container } = renderPreview({ onCustomiseStep: true });

      const look = container.querySelector(".bp-img-meta-look");
      expect(look).toHaveClass("shown");
      expect(look?.textContent).toContain("1B Natural Black");
      expect(look?.textContent).toContain("Shoulder");
    });
  });

  describe("artwork", () => {
    it("shows a photo for a style that has been shot", () => {
      renderPreview({ styleId: "knotless", styleName: "Knotless Braids" });

      expect(
        screen.getByRole("img", { name: /Knotless Braids/ }),
      ).toBeInTheDocument();
      expect(screen.queryByText(/Add your editorial/)).toBeNull();
    });

    it("falls back to the drawn preview for a style that has not", () => {
      const { container } = renderPreview({ styleId: "cornrows" });

      expect(screen.queryByRole("img")).toBeNull();
      expect(container.querySelector("#bpStrandSvg")).toBeInTheDocument();
    });

    // The drawn preview covers the service picker, where there is not yet a
    // category to show a photo of.
    it("falls back to the drawn preview before a service is chosen", () => {
      const { container } = renderPreview({
        serviceId: null,
        styleId: null,
        styleName: "",
      });

      expect(screen.queryByRole("img")).toBeNull();
      expect(container.querySelector("#bpStrandSvg")).toBeInTheDocument();
    });

    it("colours the drawn strands by the chosen shade", () => {
      const { container } = renderPreview({ styleId: "cornrows" });
      const panel = container.querySelector<HTMLElement>(".bp-image-panel");

      // 1B lifted towards the cream so it reads on the near-black panel.
      expect(panel?.style.getPropertyValue("--strand-colour")).toBe("#584f46");
      expect(panel?.style.getPropertyValue("--preview-colour")).toBe("#1A1108");
    });

    // The early steps have no style yet, and an empty black panel there looks
    // broken rather than deliberate.
    it("shows a stand-in photo before any style is chosen", () => {
      renderPreview({ styleId: null, styleName: "" });

      const photo = screen.getByRole("img", { name: "Braided hair" });
      expect(photo).toHaveAttribute(
        "src",
        expect.stringContaining("knotless-shoulder-30"),
      );
      expect(screen.queryByText(/Add your editorial/)).toBeNull();
    });
  });
});
