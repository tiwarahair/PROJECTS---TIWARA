import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../../../test/render-with-store";
import { StudioPage } from "../../..";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../../../test/setup-user";

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

const getDialog = () =>
  document.querySelector(
    '[data-screen-label="Two-step verification"]',
  ) as HTMLElement;

const runNextTimer = () => act(() => void vi.advanceTimersToNextTimer());

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

const renderFixture = (fixture: string) => {
  renderWithStore(<StudioPage />, `/studio?fixture=${fixture}`);
  runNextTimer();
};

describe("Studio → two-step verification", () => {
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

  it("tax details and Stripe stay locked until 2FA is on", () => {
    renderFixture("secure-locked");
    const dialog = getDialog();

    expect(
      within(dialog).getByText("Get paid: 2FA, tax details and Stripe"),
    ).toBeInTheDocument();

    expect(
      within(dialog).getByRole("button", { name: "Turn on" }),
    ).toBeInTheDocument();

    expect(
      within(dialog).queryByRole("button", { name: "Add" }),
    ).not.toBeInTheDocument();
  });

  it("the tax details step closes with the X, not Finish later", async () => {
    renderFixture("secure-unlocked");
    await user.click(within(getDialog()).getByRole("button", { name: "Add" }));

    const dialog = getDialog();

    expect(within(dialog).getByText("Tax details")).toBeInTheDocument();

    expect(
      within(dialog).getByRole("button", { name: "Close" }),
    ).toBeInTheDocument();

    expect(within(dialog).queryByText("Finish later")).not.toBeInTheDocument();
  });

  it("a wrong code is rejected and the right one moves on to a backup", async () => {
    renderFixture("tf-app");
    const dialog = getDialog();
    const codeLabel = "Enter the 6-digit code from the app";

    await user.type(within(dialog).getByLabelText(codeLabel), "111111");
    await user.click(within(dialog).getByRole("button", { name: "Turn on" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "That code isn’t right",
    );

    await user.clear(within(dialog).getByLabelText(codeLabel));
    await user.type(within(dialog).getByLabelText(codeLabel), "123456");
    await user.click(within(dialog).getByRole("button", { name: "Turn on" }));

    expect(
      await within(getDialog()).findByRole("status", {
        name: "Main phone added",
      }),
    ).toBeInTheDocument();

    act(() => void vi.advanceTimersByTime(900));

    expect(within(getDialog()).getByText("Add a backup")).toBeInTheDocument();

    await user.click(within(getDialog()).getByRole("button", { name: "Back" }));

    expect(
      within(getDialog()).getByText("Set up as “Main phone”"),
    ).toBeInTheDocument();

    expect(
      within(getDialog()).queryByRole("status", { name: "Main phone added" }),
    ).not.toBeInTheDocument();

    await user.click(
      within(getDialog()).getByRole("button", { name: "Continue" }),
    );

    expect(within(getDialog()).getByText("Add a backup")).toBeInTheDocument();
  });

  it("back returns to the screen before, one step at a time", async () => {
    renderFixture("secure-locked");

    await user.click(
      within(getDialog()).getByRole("button", { name: "Turn on" }),
    );

    expect(
      within(getDialog()).getByText("Turn on two‑step verification"),
    ).toBeInTheDocument();

    await user.click(
      within(getDialog()).getByRole("button", { name: "Continue" }),
    );

    await user.click(within(getDialog()).getByRole("button", { name: "Back" }));

    expect(
      within(getDialog()).getByText("Turn on two‑step verification"),
    ).toBeInTheDocument();

    await user.click(within(getDialog()).getByRole("button", { name: "Back" }));

    expect(
      within(getDialog()).getByText("Get paid: 2FA, tax details and Stripe"),
    ).toBeInTheDocument();

    expect(
      within(getDialog()).queryByRole("button", { name: "Back" }),
    ).not.toBeInTheDocument();
  });

  it("copying the key swaps the icon to a tick, then back", async () => {
    renderFixture("tf-app");

    await user.click(
      within(getDialog()).getByRole("button", {
        name: "Can’t scan? Enter this key instead",
      }),
    );

    await user.click(
      within(getDialog()).getByRole("button", { name: "Copy key" }),
    );

    expect(
      await within(getDialog()).findByRole("button", { name: "Key copied" }),
    ).toBeInTheDocument();

    act(() => void vi.advanceTimersByTime(1500));

    expect(
      within(getDialog()).getByRole("button", { name: "Copy key" }),
    ).toBeInTheDocument();
  });

  it("the backup's QR step says where to scan it", async () => {
    renderFixture("tf-backup");

    await user.click(
      within(getDialog()).getByRole("button", { name: "Add backup" }),
    );

    expect(
      within(getDialog()).getByText(
        "Open your authenticator app on your backup phone or tablet, scan this QR code, then enter the 6-digit code it shows.",
      ),
    ).toBeInTheDocument();
  });

  it("skipping the backup warns once, then finishes", async () => {
    renderFixture("tf-backup");
    const dialog = getDialog();

    await user.click(
      within(dialog).getByRole("button", { name: "Skip for now" }),
    );

    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Without a backup",
    );

    await user.click(
      within(dialog).getByRole("button", { name: "Skip anyway" }),
    );

    expect(
      within(getDialog()).getByText("Two‑step verification is on"),
    ).toBeInTheDocument();

    expect(
      screen.getAllByRole("button", { name: "Close" }).length,
    ).toBeGreaterThan(0);
  });
});
