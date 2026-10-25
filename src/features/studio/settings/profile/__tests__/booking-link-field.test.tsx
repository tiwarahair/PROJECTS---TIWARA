import { act, screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { changeSlug, isSlugFree } from "../../../../../lib/studio-api/settings";
import { renderWithStore } from "../../../../../test/render-with-store";
import { setupUser } from "../../../../../test/setup-user";
import { getStudioRow, getStudioSeed } from "../../../../../test/studio-seed";
import { BookingLinkField } from "../booking-link-field";
import type { StudioContext } from "../../../core/actions";
import type { StudioState } from "../../../core/types";
import { useStudio } from "../../../core/use-studio";

vi.mock("../../../../../lib/studio-api/settings", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../../../lib/studio-api/settings")
  >()),
  isSlugFree: vi.fn(),
  changeSlug: vi.fn(),
}));

type Account = NonNullable<StudioState["account"]>;

interface HarnessProps {
  account: Account;
}

const ACCOUNT: Account = {
  stylistId: "stylist-1",
  slug: "amara-braids",
  slugChangedAt: null,
  isSuspended: false,
  suspendReason: null,
};

let user: UserEvent;
let memo: StudioContext["memo"];
let getAccount: () => StudioState["account"];

const Harness = ({ account: { slug, slugChangedAt } }: HarnessProps) => {
  const studio = useStudio({
    seed: getStudioSeed({
      studio: getStudioRow({ slug, slug_changed_at: slugChangedAt }),
    }),
  });

  const { state, context } = studio;

  memo = context.memo;
  getAccount = () => context.getState().account;

  return (
    <>
      <BookingLinkField studio={studio} />
      <p data-testid="toast">{state.toast}</p>
    </>
  );
};

const renderField = (account: Partial<Account> = {}) =>
  renderWithStore(<Harness account={{ ...ACCOUNT, ...account }} />);

const getInput = () => screen.getByRole("textbox");

const getStatus = () => screen.getByRole("status");

// runs the 400ms debounce, then lets the mocked isSlugFree resolve
const finishCheck = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(400);
  });

const typeSlug = async (slug: string) => {
  await user.clear(getInput());
  await user.type(getInput(), slug);
};

const saveSlug = () => act(() => memo.saveSlug?.());

describe("BookingLinkField", () => {
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

    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    vi.mocked(isSlugFree).mockReset().mockResolvedValue(true);
    vi.mocked(changeSlug).mockReset();
    user = setupUser();
  });

  afterEach(() => vi.useRealTimers());

  it("shows the current slug with no status until it changes", () => {
    renderField();

    expect(getInput()).toHaveValue("amara-braids");
    expect(getInput()).toBeEnabled();
    expect(getStatus()).toHaveTextContent("");
  });

  it("flags an invalid slug without checking it", async () => {
    renderField();
    await typeSlug("ab");
    await finishCheck();

    expect(getStatus()).toHaveTextContent(
      "Use 3–40 lowercase letters, numbers and single hyphens",
    );

    expect(isSlugFree).not.toHaveBeenCalled();
  });

  it("checks a valid slug after the debounce and shows it is available", async () => {
    renderField();
    await typeSlug("amara-hair");

    expect(getStatus()).toHaveTextContent("Checking…");

    await finishCheck();

    expect(isSlugFree).toHaveBeenCalledTimes(1);
    expect(isSlugFree).toHaveBeenCalledWith("amara-hair", "stylist-1");
    expect(getStatus()).toHaveTextContent("Available");
  });

  it("shows a taken slug", async () => {
    vi.mocked(isSlugFree).mockResolvedValue(false);
    renderField();
    await typeSlug("taken-link");
    await finishCheck();

    expect(getStatus()).toHaveTextContent("That link is taken");
  });

  it("lowercases the input and turns spaces into hyphens", async () => {
    renderField();
    await typeSlug("Amara Hair Studio");

    expect(getInput()).toHaveValue("amara-hair-studio");
  });

  it("locks the field for 30 days after a change", () => {
    renderField({ slugChangedAt: new Date(2026, 8, 1).toISOString() });

    expect(getInput()).toBeDisabled();

    expect(
      screen.getByText(/You can change this again on 1 Oct/),
    ).toBeInTheDocument();
  });

  it("unlocks the field once 30 days have passed", () => {
    renderField({ slugChangedAt: new Date(2026, 7, 1).toISOString() });

    expect(getInput()).toBeEnabled();

    expect(
      screen.getByText(/You can change this once every 30 days/),
    ).toBeInTheDocument();
  });

  describe("saveSlug", () => {
    it("resolves true without saving when the slug is unchanged", async () => {
      renderField();

      expect(await saveSlug()).toBe(true);
      expect(changeSlug).not.toHaveBeenCalled();
    });

    it("resolves false with a toast when the slug isn't available", async () => {
      vi.mocked(isSlugFree).mockResolvedValue(false);
      renderField();
      await typeSlug("taken-link");
      await finishCheck();

      expect(await saveSlug()).toBe(false);
      expect(changeSlug).not.toHaveBeenCalled();

      expect(screen.getByTestId("toast")).toHaveTextContent(
        "Choose an available booking link first.",
      );
    });

    it("saves an available slug and updates the account", async () => {
      vi.mocked(changeSlug).mockResolvedValue("amara-hair");
      renderField();
      await typeSlug("amara-hair");
      await finishCheck();

      expect(await saveSlug()).toBe(true);
      expect(changeSlug).toHaveBeenCalledWith("amara-hair");

      expect(getAccount()).toEqual({
        stylistId: "stylist-1",
        slug: "amara-hair",
        slugChangedAt: new Date().toISOString(),
        isSuspended: false,
        suspendReason: null,
      });

      expect(getStatus()).toHaveTextContent("");
      expect(getInput()).toBeDisabled();
    });
  });
});
