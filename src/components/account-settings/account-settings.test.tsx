import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountSettings } from "./account-settings";
import type { AccountSettingsApi } from "./account-settings";
import type { PayoutStatus } from "./account-settings-logic";

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe("AccountSettings", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders the personal page with saving disabled", () => {
    render(<AccountSettings />);
    expect(screen.getByLabelText("First name")).toHaveValue("Amara");
    expect(screen.getByText("amara.okonkwo@gmail.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("saves a name change and reports it to the host", () => {
    const onState = vi.fn<(api: AccountSettingsApi) => void>();
    render(<AccountSettings onState={onState} />);
    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Ama" },
    });
    expect(onState.mock.lastCall?.[0].canSave).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByText("Personal details saved")).toBeInTheDocument();
    expect(onState.mock.lastCall?.[0].canSave).toBe(false);
  });

  it("changes the login phone with a code; 000000 is rejected", () => {
    render(<AccountSettings />);
    fireEvent.click(screen.getAllByRole("button", { name: "Change" })[1]!);
    fireEvent.change(screen.getByLabelText("New phone number"), {
      target: { value: "07700 900999" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    const code = screen.getByLabelText("Enter the code sent to 07700 900999");
    fireEvent.change(code, { target: { value: "000000" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "That code didn’t match. Check the latest text and try again.",
    );
    fireEvent.change(code, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect(screen.getByText("07700 900999")).toBeInTheDocument();
  });

  it("blocks closing the account while bookings are upcoming", () => {
    render(<AccountSettings upcoming={2} />);
    expect(
      screen.getByText(
        "You have 2 upcoming bookings. Cancel or complete them first.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Close account" }),
    ).toBeDisabled();
  });

  it("confirms closing the account in a dialog on <body>", () => {
    render(<AccountSettings />);
    fireEvent.click(screen.getByRole("button", { name: "Close account" }));
    const dialog = screen.getByRole("alertdialog", {
      name: "Close your account?",
    });
    expect(dialog.closest("[data-ac-portal]")?.parentElement).toBe(
      document.body,
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Close account" }),
    );
    expect(screen.getByText("Account closed")).toBeInTheDocument();
  });

  it("security: loads the sessions, then signs out of one", () => {
    render(<AccountSettings page="security" />);
    expect(screen.getByLabelText("Loading sessions")).toBeInTheDocument();
    advance(700);
    fireEvent.click(
      screen.getByRole("button", { name: "Sign out of iPad, Safari" }),
    );
    expect(screen.getByText("Signed out of iPad")).toBeInTheDocument();
  });

  it("security: a social sign-in offers to set a password", () => {
    render(<AccountSettings page="security" signIn="apple" />);
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
    render(<AccountSettings page="payouts" payoutStatus={payoutStatus} />);
    expect(screen.getByText(title)).toBeInTheDocument();
  });

  it("payouts without tax details are on hold", () => {
    const onTaxAdd = vi.fn();
    render(<AccountSettings page="payouts" onTaxAdd={onTaxAdd} />);
    fireEvent.click(screen.getByRole("button", { name: "Add tax details" }));
    expect(onTaxAdd).toHaveBeenCalled();
  });

  it("notifications toggle per channel", () => {
    render(<AccountSettings page="notifications" />);
    const sms = screen.getByRole("switch", { name: "New booking by SMS" });
    fireEvent.click(sms);
    expect(sms).toHaveAttribute("aria-checked", "true");
  });

  it("calendar connects Google after a short wait", () => {
    render(<AccountSettings page="calendar" isNew={true} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Connect Google Calendar" }),
    );
    expect(screen.getByText("Connecting to Google")).toBeInTheDocument();
    advance(1200);
    expect(screen.getByText("Google Calendar connected")).toBeInTheDocument();
  });
});
