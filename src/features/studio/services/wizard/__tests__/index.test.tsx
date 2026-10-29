import { act, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../../../test/render-with-store";
import { getStudioSeed } from "../../../../../test/studio-seed";
import { StudioPage } from "../../..";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../../../test/setup-user";
import { saveService } from "../../../../../lib/studio-api/services";
import { addPortfolioPhoto } from "../../../../../lib/studio-api/photos";

// saves stay in flight, so the screen keeps what was done
vi.mock("../../../../../lib/studio-api/services", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../../../lib/studio-api/services")
  >()),
  saveService: vi.fn(() => new Promise(() => {})),
  saveCategories: vi.fn().mockResolvedValue(undefined),
  saveAddon: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../../../lib/studio-api/photos", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../../../lib/studio-api/photos")
  >()),
  uploadPhotoWithCopies: vi.fn((path: string) => Promise.resolve(path)),
  addPortfolioPhoto: vi.fn().mockResolvedValue(undefined),
}));

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

const getLabelled = (label: string) =>
  document.querySelector(`[data-screen-label="${label}"]`) as HTMLElement;

const runNextTimer = () => act(() => void vi.advanceTimersToNextTimer());
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

const setViewport = (width: number) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const minWidth = /min-width:\s*(\d+)px/.exec(query);

    return {
      matches: minWidth ? width >= Number(minWidth[1]) : false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  });
};

const openWizard = async () => {
  renderWithStore(<StudioPage seed={getStudioSeed()} />, "/studio");
  runNextTimer();
  await user.click(within(getLabelled("Sidebar")).getByTitle("Services"));
  await user.click(screen.getByRole("button", { name: "Add service" }));
  advance(300);
};

const pickSuggestion = async (name: string) => {
  await user.click(screen.getByRole("button", { name: "Suggested services" }));

  await user.click(
    within(getLabelled("Suggested services")).getByRole("button", { name }),
  );

  advance(1200);
};

const getContinue = () => screen.getByRole("button", { name: "Continue" });

describe("Studio → service wizard", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "Date",
      ],
    });

    vi.setSystemTime(new Date(2026, 8, 7, 9, 0));
    localStorage.clear();
    setViewport(1440);
  });

  afterEach(() => vi.useRealTimers());

  it("needs a name and service type before Continue", async () => {
    await openWizard();
    expect(screen.getByText("Details")).toBeInTheDocument();
    await user.click(getContinue());

    expect(await screen.findByText("Name this service.")).toBeInTheDocument();
    expect(screen.getByText("Choose the service type.")).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText("e.g. Knotless braids"),
      "Cornrows",
    );

    await waitFor(() =>
      expect(screen.queryByText("Name this service.")).not.toBeInTheDocument(),
    );

    expect(screen.getByText("Choose the service type.")).toBeInTheDocument();
  });

  it("size options are chips that each open a sheet to edit and save", async () => {
    await openWizard();
    await pickSuggestion("Knotless braids");
    await user.click(getContinue());
    await screen.findByText("Pricing");

    expect(screen.getAllByLabelText("Base price")).toHaveLength(1);

    const getChip = (name: RegExp) =>
      within(screen.getByRole("group", { name: "Size / thickness" })).getByRole(
        "button",
        { name },
      );

    expect(getChip(/^Small, \+£45 \+1h$/)).toBeInTheDocument();

    await user.click(getChip(/^Medium$/));

    const sheet = within(getLabelled("Option dialog"));

    expect(sheet.getByLabelText("Name")).toHaveValue("Size / thickness");
    expect(sheet.getByLabelText("Option")).toHaveValue("Medium");

    await user.type(sheet.getByLabelText("Medium price in pounds"), "10");
    await user.selectOptions(sheet.getByLabelText("Medium minutes"), "30");
    await user.click(sheet.getByRole("button", { name: "Save" }));

    expect(getChip(/^Medium, \+£10 \+30m$/)).toBeInTheDocument();

    await user.click(getChip(/^Large/));
    await user.type(screen.getByLabelText("Large price in pounds"), "5");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(getChip(/^Large, −£10 −30m$/)).toBeInTheDocument();

    await user.click(getChip(/^Jumbo/));
    await user.click(screen.getByRole("switch", { name: "Offer this size" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(getChip(/^Jumbo$/)).toBeInTheDocument();
    expect(getChip(/^Jumbo$/)).toHaveFocus();

    await user.click(getChip(/^Medium/));
    await user.selectOptions(screen.getByLabelText("Medium minutes"), "5");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(getChip(/^Medium, \+£10 \+5m$/)).toBeInTheDocument();
  });

  it("pricing errors wait for the field to be left or Continue", async () => {
    await openWizard();
    await pickSuggestion("Knotless braids");
    await user.click(getContinue());
    await screen.findByText("Pricing");

    const price = screen.getByLabelText("Base price");

    await user.clear(price);

    expect(screen.queryByText("Enter a price.")).not.toBeInTheDocument();

    expect(
      screen.queryByText("Add how long it takes."),
    ).not.toBeInTheDocument();

    await user.tab();

    expect(await screen.findByText("Enter a price.")).toBeInTheDocument();

    expect(
      screen.queryByText("Add how long it takes."),
    ).not.toBeInTheDocument();
  });

  it("a suggestion fills the form and the wizard adds the service", async () => {
    await openWizard();
    await pickSuggestion("Knotless braids");
    expect(screen.getByDisplayValue("Knotless braids")).toBeInTheDocument();
    await user.click(getContinue());
    expect(await screen.findByText("Pricing")).toBeInTheDocument();
    expect(screen.getByText("Add size options")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Review your prices" }),
    );

    expect(screen.getByText("Review prices")).toBeInTheDocument();
    await user.click(getContinue());

    expect(
      await screen.findByText("Added to this service"),
    ).toBeInTheDocument();

    // the Services header has its own "Add service" button; the footer's comes last
    await user.click(
      screen
        .getAllByRole("button", { name: "Add service" })
        .at(-1) as HTMLElement,
    );

    expect(
      await screen.findByText("Knotless braids added to your services"),
    ).toBeInTheDocument();
  });

  it("takes up to 5 photos, which upload to the portfolio and go on the service when it saves", async () => {
    URL.createObjectURL = vi.fn(() => "blob:photo");
    URL.revokeObjectURL = vi.fn();
    await openWizard();
    await pickSuggestion("Knotless braids");

    const images = Array.from(
      { length: 6 },
      (_unused, index) =>
        new File(["x"], `photo-${index}.jpg`, { type: "image/jpeg" }),
    );

    await user.upload(screen.getByLabelText("Service images"), images);

    expect(screen.getAllByAltText("Service photo")).toHaveLength(5);
    expect(screen.queryByText("Choose a file")).not.toBeInTheDocument();

    await user.click(
      screen.getAllByRole("button", { name: "Remove photo" })[0] as HTMLElement,
    );

    expect(screen.getAllByAltText("Service photo")).toHaveLength(4);
    expect(screen.getByText("Choose a file")).toBeInTheDocument();

    await user.click(getContinue());

    await user.click(
      await screen.findByRole("button", { name: "Review your prices" }),
    );

    await user.click(getContinue());
    await screen.findByText("Added to this service");

    await user.click(
      screen
        .getAllByRole("button", { name: "Add service" })
        .at(-1) as HTMLElement,
    );

    expect(
      await screen.findByText("Knotless braids added to your services"),
    ).toBeInTheDocument();

    await vi.waitFor(() => expect(saveService).toHaveBeenCalled());

    const photoIds = vi.mocked(saveService).mock.calls.at(-1)?.[3] ?? [];

    expect(photoIds).toHaveLength(4);

    expect(
      vi.mocked(addPortfolioPhoto).mock.calls.map(([{ id }]) => id),
    ).toEqual(photoIds);
  });

  it("editing jumps to the tab with a missing price on save", async () => {
    renderWithStore(<StudioPage seed={getStudioSeed()} />, "/studio");
    runNextTimer();
    await user.click(within(getLabelled("Sidebar")).getByTitle("Services"));
    await user.click(screen.getAllByText("Silk press")[0] as HTMLElement);
    advance(300);
    await user.click(screen.getByRole("button", { name: "Pricing" }));
    await user.clear(screen.getAllByLabelText("Base price")[0] as HTMLElement);

    await user.click(
      screen.getAllByRole("button", { name: "Add-ons" }).at(-1) as HTMLElement,
    );

    await user.click(screen.getByRole("button", { name: "Save service" }));

    expect(await screen.findByText("Enter a price.")).toBeInTheDocument();
  });

  it("a customisation needs a name and two options", async () => {
    await openWizard();
    await pickSuggestion("Knotless braids");
    await user.click(getContinue());

    await user.click(
      await screen.findByRole("button", { name: "Add a customisation" }),
    );

    const dialog = getLabelled("Customisation dialog");

    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Add a name, like Parting",
    );

    await user.type(
      within(dialog).getByPlaceholderText("e.g. Service type"),
      "Parting",
    );

    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Add at least 2 options",
    );

    const [first, second] = within(dialog).getAllByLabelText("Option name");

    await user.type(first as HTMLElement, "Middle");
    await user.type(second as HTMLElement, "Side");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(screen.getByText("Parting")).toBeInTheDocument();
  });
});
