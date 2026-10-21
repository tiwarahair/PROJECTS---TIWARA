import { act, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../../test/render-with-store";
import { getStudioSeed } from "../../../../test/studio-seed";
import { useStudio } from "../../core/use-studio";
import type { StudioController } from "../../core/use-studio";
import { ClientSummarySheet } from "../summary-sheet";

let studio: StudioController;

const Harness = () => {
  studio = useStudio({ seed: getStudioSeed() });

  return <ClientSummarySheet studio={studio} />;
};

describe("ClientSummarySheet", () => {
  it("lists the client's past appointments", () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    renderWithStore(<Harness />, "/studio");
    act(() => studio.setState({ sheetClientId: "client-nia" }));

    expect(screen.getByText("Nia Okafor")).toBeInTheDocument();
    expect(screen.getByText("Recent appointments")).toBeInTheDocument();
    expect(screen.getByText("Silk press")).toBeInTheDocument();
  });
});
