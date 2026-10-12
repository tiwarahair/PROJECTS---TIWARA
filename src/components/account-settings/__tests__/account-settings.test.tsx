import { act, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { AccountSettings } from "../account-settings";
import type { AccountSettingsApi } from "../account-settings";
import type { PayoutStatus } from "../account-settings-logic";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe("AccountSettings", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders the personal page with saving disabled", () => {
    render(<AccountSettings />, { wrapper: MemoryRouter });
    expect(screen.getByLabelText("First name")).toHaveValue("Amara");
    expect(screen.getByText("amara.okonkwo@gmail.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("saves a name change and reports it to the host", async () => {
    const onState = vi.fn<(api: AccountSettingsApi) => void>();

    render(<AccountSettings onState={onState} />, { wrapper: MemoryRouter });

    await user.clear(screen.getByLabelText("First name"));
    await user.type(screen.getByLabelText("First name"), "Ama");

    expect(onState.mock.lastCall?.[0].canSave).toBe(true);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByText("Personal details saved")).toBeInTheDocument();
    expect(onState.mock.lastCall?.[0].canSave).toBe(false);
  });

  it("changes the login phone with a code; 000000 is rejected", async () => {
    render(<AccountSettings />, { wrapper: MemoryRouter });
    await user.click(screen.getAllByRole("button", { name: "Change" })[1]!);

    await user.type(screen.getByLabelText("New phone number"), "07700 900999");

    await user.click(screen.getByRole("button", { name: "Send code" }));
    const code = screen.getByLabelText("Enter the code sent to 07700 900999");

    await user.type(code, "000000");
    await user.click(screen.getByRole("button", { name: "Verify" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "That code didn’t match. Check the latest text and try again.",
    );

    await user.clear(code);
    await user.type(code, "123456");
    await user.click(screen.getByRole("button", { name: "Verify" }));
    expect(screen.getByText("07700 900999")).toBeInTheDocument();
  });

  it("blocks closing the account while bookings are upcoming", () => {
    render(<AccountSettings upcoming={2} />, { wrapper: MemoryRouter });

    expect(
      screen.getByText(
        "You have 2 upcoming bookings. Cancel or complete them first.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Close account" }),
    ).toBeDisabled();
  });

  it("confirms closing the account in a dialog on <body>", async () => {
    render(<AccountSettings />, { wrapper: MemoryRouter });
    await user.click(screen.getByRole("button", { name: "Close account" }));

    const dialog = screen.getByRole("alertdialog", {
      name: "Close your account?",
    });

    expect(dialog.closest("[data-ac-portal]")?.parentElement).toBe(
      document.body,
    );

    await user.click(
      within(dialog).getByRole("button", { name: "Close account" }),
    );

    expect(screen.getByText("Account closed")).toBeInTheDocument();
  });

  it("security: loads the sessions, then signs out of one", async () => {
    render(<AccountSettings page="security" />, { wrapper: MemoryRouter });
    expect(screen.getByLabelText("Loading sessions")).toBeInTheDocument();
    advance(700);

    await user.click(
      screen.getByRole("button", { name: "Sign out of iPad, Safari" }),
    );

    expect(screen.getByText("Signed out of iPad")).toBeInTheDocument();
  });

  it("security: a social sign-in offers to set a password", () => {
    render(<AccountSettings page="security" signIn="apple" />, {
      wrapper: MemoryRouter,
    });

    expect(
      screen.getByText(
        "You sign in with Apple. Set a password to also sign in with email.",
      ),
    ).toBeInTheDocument();
  });

  it.each<[PayoutStatus, string]>([
    ["none", "Not connected"],
    ["verifying", "Stripe is checking your details"],
    ["action", "Stripe needs more information"],
    ["paused", "Payouts paused"],
    ["active", "Payouts active"],
  ])("payouts status %s", (payoutStatus, title) => {
    render(<AccountSettings page="payouts" payoutStatus={payoutStatus} />, {
      wrapper: MemoryRouter,
    });

    expect(screen.getByText(title)).toBeInTheDocument();
  });

  it("payouts without tax details are on hold", async () => {
    const onTaxAdd = vi.fn();

    render(<AccountSettings page="payouts" onTaxAdd={onTaxAdd} />, {
      wrapper: MemoryRouter,
    });

    await user.click(screen.getByRole("button", { name: "Add tax details" }));
    expect(onTaxAdd).toHaveBeenCalled();
  });

  it("notifications toggle per channel", async () => {
    render(<AccountSettings page="notifications" />, { wrapper: MemoryRouter });
    const sms = screen.getByRole("switch", { name: "New booking by SMS" });

    await user.click(sms);
    expect(sms).toHaveAttribute("aria-checked", "true");
  });

  it("calendar connects Google after a short wait", async () => {
    render(<AccountSettings page="calendar" isNew={true} />, {
      wrapper: MemoryRouter,
    });

    await user.click(
      screen.getByRole("button", { name: "Connect Google Calendar" }),
    );

    expect(screen.getByText("Connecting to Google")).toBeInTheDocument();
    advance(1200);
    expect(screen.getByText("Google Calendar connected")).toBeInTheDocument();
  });
});
