import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserEvent } from "@testing-library/user-event";
import { renderWithStore } from "../../../../../test/render-with-store";
import { getStudioRow, getStudioSeed } from "../../../../../test/studio-seed";
import { setupUser } from "../../../../../test/setup-user";
import { saveService } from "../../../../../lib/studio-api/services";
import { StudioPage } from "../../..";

vi.mock("../../../../../lib/studio-api/services", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../../../lib/studio-api/services")
  >()),
  saveService: vi.fn().mockResolvedValue(undefined),
}));

let user: UserEvent;

const getLabelled = (label: string) =>
  document.querySelector(`[data-screen-label="${label}"]`) as HTMLElement;

const getPhoto = (id: string, sort: number, serviceId: string | null) => ({
  id,
  stylist_id: "stylist-1",
  service_id: serviceId,
  path: `stylist-1/portfolio/${id}-full.jpg`,
  sort,
  created_at: "",
});

const openProfile = async (
  studio = getStudioRow({
    portfolio_photos: [getPhoto("p-1", 0, "s-1"), getPhoto("p-2", 1, null)],
  }),
) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: /min-width/.test(query),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

  renderWithStore(<StudioPage seed={getStudioSeed({ studio })} />, "/studio", {
    signedIn: true,
  });

  act(() => void vi.advanceTimersToNextTimer());
  await user.click(within(getLabelled("Sidebar")).getByTitle("Settings"));
};

describe("Studio → Settings → portfolio photos on services", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });

    user = setupUser();
    localStorage.clear();
  });

  afterEach(() => vi.useRealTimers());

  it("shows each photo's service and attaches a loose one", async () => {
    await openProfile();

    expect(
      screen.getByRole("button", { name: "On Silk press. Change service" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Attach to service" }));

    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByText("Attach to a service")).toBeInTheDocument();

    expect(within(dialog).getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(
      within(dialog).getByRole("button", { name: /Silk press/ }),
    );

    expect(
      await screen.findByText("Photo added to Silk press"),
    ).toBeInTheDocument();

    expect(
      screen.getAllByRole("button", { name: "On Silk press. Change service" }),
    ).toHaveLength(2);

    await vi.waitFor(() =>
      expect(vi.mocked(saveService).mock.calls.at(-1)?.[3]).toEqual([
        "p-1",
        "p-2",
      ]),
    );
  });

  it("with no services, says so and goes to Services", async () => {
    await openProfile(
      getStudioRow({
        services: [],
        portfolio_photos: [getPhoto("p-1", 0, null)],
      }),
    );

    await user.click(screen.getByRole("button", { name: "Attach to service" }));

    const dialog = await screen.findByRole("dialog");

    expect(
      within(dialog).getByText(/You haven’t added any services yet/),
    ).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("button", { name: "Go to services" }),
    );

    expect(
      await screen.findByRole("button", { name: "Add service" }),
    ).toBeInTheDocument();
  });
});
