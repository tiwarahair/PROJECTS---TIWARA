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

    expect(
      await screen.findByText("Personal details saved"),
    ).toBeInTheDocument();

    expect(onState.mock.lastCall?.[0].canSave).toBe(false);
  });

  it("saves a new mobile straight away, no code", async () => {
    render(<AccountSettings />, { wrapper: MemoryRouter });
    await user.click(screen.getAllByRole("button", { name: "Change" })[1]!);
    await user.type(screen.getByLabelText("New phone number"), "07700 900999");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("07700 900999")).toBeInTheDocument();
    expect(screen.getByText("Mobile updated")).toBeInTheDocument();
  });

  it("changes the login email with a code from each address", async () => {
    render(<AccountSettings />, { wrapper: MemoryRouter });
    await user.click(screen.getAllByRole("button", { name: "Change" })[0]!);
    await user.type(screen.getByLabelText("New email"), "amara@example.com");
    await user.click(screen.getByRole("button", { name: "Send codes" }));

    await user.type(
      await screen.findByLabelText("Code sent to amara.okonkwo@gmail.com"),
      "000000",
    );

    await user.type(
      screen.getByLabelText("Code sent to amara@example.com"),
      "123456",
    );

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The code sent to amara.okonkwo@gmail.com isn’t right or has expired.",
    );

    await user.clear(
      screen.getByLabelText("Code sent to amara.okonkwo@gmail.com"),
    );

    await user.type(
      screen.getByLabelText("Code sent to amara.okonkwo@gmail.com"),
      "123456",
    );

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByText("Login email updated")).toBeInTheDocument();
    expect(screen.getByText("amara@example.com")).toBeInTheDocument();
  });

  it("blocks closing the business while bookings are upcoming", () => {
    render(<AccountSettings upcoming={2} />, { wrapper: MemoryRouter });

    expect(
      screen.getByText(
        "You have 2 upcoming bookings. Cancel or complete them first.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Close business" }),
    ).toBeDisabled();
  });

  it("confirms closing the business in a dialog on <body>", async () => {
    render(<AccountSettings />, { wrapper: MemoryRouter });
    await user.click(screen.getByRole("button", { name: "Close business" }));

    const dialog = screen.getByRole("alertdialog", {
      name: "Close your business?",
    });

    expect(dialog.closest("[data-ac-portal]")?.parentElement).toBe(
      document.body,
    );

    await user.click(
      within(dialog).getByRole("button", { name: "Close business" }),
    );

    expect(await screen.findByText("Business closed")).toBeInTheDocument();
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

  it("security: when Supabase asks, the password change needs the emailed code", async () => {
    render(<AccountSettings page="security" />, { wrapper: MemoryRouter });

    expect(
      screen.queryByLabelText("Code from your email"),
    ).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("New password"), "tide2lamp-violet");

    await user.type(
      screen.getByLabelText("Confirm new password"),
      "tide2lamp-violet",
    );

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("We emailed a code to amara.okonkwo@gmail.com"),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Code from your email"), "111111");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That code isn’t right or has expired.",
    );

    await user.clear(screen.getByLabelText("Code from your email"));
    await user.type(screen.getByLabelText("Code from your email"), "123456");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText(/^Password updated/)).toBeInTheDocument();
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
