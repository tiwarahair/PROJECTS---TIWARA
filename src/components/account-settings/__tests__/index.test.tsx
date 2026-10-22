import { act, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import type { AccountSettingsBackend } from "../backend";
import { AccountSettings } from "..";
import type { AccountSettingsApi } from "..";
import type { PayoutStatus, SettingsPerson } from "../logic";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

let user: UserEvent;
let backend: AccountSettingsBackend;

const CODE = "123456";
const FEED = "https://tiwarashouse.com/cal/studio";

const getTestBackend = (): AccountSettingsBackend => ({
  saveName: vi.fn(() => Promise.resolve()),
  savePhone: vi.fn(() => Promise.resolve()),
  sendEmailCodes: vi.fn(() => Promise.resolve(null)),
  verifyEmailCode: vi.fn((email: string, code: string) =>
    Promise.resolve(!!email && code === CODE),
  ),
  sendPasswordCode: vi.fn(() => Promise.resolve()),
  closeBusiness: vi.fn(() => Promise.resolve()),
  saveNotification: vi.fn(() => Promise.resolve()),
  getSecurity: vi.fn(() =>
    Promise.resolve({
      login_alerts: true,
      sessions: [
        {
          id: "s1",
          device: "iPhone · Safari",
          kind: "phone" as const,
          signed_in_at: "2026-10-01T09:00:00Z",
          active_at: "2026-10-21T09:00:00Z",
          is_current: true,
        },
        {
          id: "s2",
          device: "iPad · Safari",
          kind: "tablet" as const,
          signed_in_at: "2026-10-12T09:00:00Z",
          active_at: "2026-10-18T09:00:00Z",
          is_current: false,
        },
      ],
    }),
  ),
  signOutSession: vi.fn(() => Promise.resolve()),
  signOutOthers: vi.fn(() => Promise.resolve()),
  saveLoginAlerts: vi.fn(() => Promise.resolve()),
  getCalendarFeed: vi.fn(() => Promise.resolve(`${FEED}/first.ics`)),
  resetCalendarFeed: vi.fn(() => Promise.resolve(`${FEED}/second.ics`)),
  changePassword: vi.fn((password: string, code: string) => {
    if (!code) return Promise.resolve("reauthentication_needed");

    return Promise.resolve(
      password && code === CODE ? null : "reauthentication_not_valid",
    );
  }),
});

const person: SettingsPerson = {
  first: "Amara",
  last: "Okonkwo",
  email: "amara.okonkwo@gmail.com",
  phone: "07700 900418",
};

beforeEach(() => {
  user = setupUser();
  backend = getTestBackend();
});

describe("AccountSettings", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders the personal page with saving disabled", () => {
    render(<AccountSettings person={person} backend={backend} />, {
      wrapper: MemoryRouter,
    });

    expect(screen.getByLabelText("First name")).toHaveValue("Amara");
    expect(screen.getByText("amara.okonkwo@gmail.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("saves a name change and reports it to the host", async () => {
    const onState = vi.fn<(api: AccountSettingsApi) => void>();

    render(
      <AccountSettings person={person} backend={backend} onState={onState} />,
      {
        wrapper: MemoryRouter,
      },
    );

    await user.clear(screen.getByLabelText("First name"));
    await user.type(screen.getByLabelText("First name"), "Ama");

    expect(onState.mock.lastCall?.[0].canSave).toBe(true);
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("Personal details saved"),
    ).toBeInTheDocument();

    expect(onState.mock.lastCall?.[0].canSave).toBe(false);
  });

  it("a blank name shows its error on save until it's filled in", async () => {
    render(<AccountSettings person={person} backend={backend} />, {
      wrapper: MemoryRouter,
    });

    await user.clear(screen.getByLabelText("Last name"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("Enter your last name."),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Last name"), "Okafor");

    await waitFor(() =>
      expect(
        screen.queryByText("Enter your last name."),
      ).not.toBeInTheDocument(),
    );
  });

  it("discarding puts the saved name back", async () => {
    const onState = vi.fn<(api: AccountSettingsApi) => void>();

    render(
      <AccountSettings person={person} backend={backend} onState={onState} />,
      {
        wrapper: MemoryRouter,
      },
    );

    await user.type(screen.getByLabelText("First name"), "x");
    act(() => onState.mock.lastCall?.[0].discard());

    expect(screen.getByLabelText("First name")).toHaveValue("Amara");
    expect(onState.mock.lastCall?.[0].canSave).toBe(false);
  });

  it("saves a new mobile straight away, no code", async () => {
    render(<AccountSettings person={person} backend={backend} />, {
      wrapper: MemoryRouter,
    });

    await user.click(screen.getAllByRole("button", { name: "Change" })[1]!);
    await user.type(screen.getByLabelText("New phone number"), "07700 900999");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("07700 900999")).toBeInTheDocument();
    expect(screen.getByText("Mobile updated")).toBeInTheDocument();
  });

  it("checks the new login email and mobile before sending anything", async () => {
    render(<AccountSettings person={person} backend={backend} />, {
      wrapper: MemoryRouter,
    });

    await user.click(screen.getAllByRole("button", { name: "Change" })[0]!);
    await user.type(screen.getByLabelText("New email"), "amara@");
    await user.click(screen.getByRole("button", { name: "Send codes" }));

    expect(
      await screen.findByText(
        "Enter an email address, like name@example.co.uk.",
      ),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText("New email"));

    await user.type(
      screen.getByLabelText("New email"),
      "Amara.Okonkwo@gmail.com",
    );

    expect(
      await screen.findByText("That’s already your login email."),
    ).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Change" })[0]!);
    await user.type(screen.getByLabelText("New phone number"), "12345");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Enter a UK mobile number, like 07700 900418."),
    ).toBeInTheDocument();
  });

  it("a mobile error clears while typing", async () => {
    render(<AccountSettings person={person} backend={backend} />, {
      wrapper: MemoryRouter,
    });

    await user.click(screen.getAllByRole("button", { name: "Change" })[1]!);
    await user.type(screen.getByLabelText("New phone number"), "0");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Enter a UK mobile number, like 07700 900418."),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("New phone number"), "7");

    expect(
      screen.queryByText("Enter a UK mobile number, like 07700 900418."),
    ).not.toBeInTheDocument();
  });

  it("resending the email codes clears the old codes and error", async () => {
    render(<AccountSettings person={person} backend={backend} />, {
      wrapper: MemoryRouter,
    });

    await user.click(screen.getAllByRole("button", { name: "Change" })[0]!);
    await user.type(screen.getByLabelText("New email"), "amara@example.com");
    await user.click(screen.getByRole("button", { name: "Send codes" }));

    const current = await screen.findByLabelText(
      "Code sent to amara.okonkwo@gmail.com",
    );

    await user.type(current, "000000");

    await user.type(
      screen.getByLabelText("Code sent to amara@example.com"),
      "123456",
    );

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await user.type(current, "{Backspace}");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Resend codes" }));

    await waitFor(() =>
      expect(
        screen.getByLabelText("Code sent to amara@example.com"),
      ).toHaveValue(""),
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("changes the login email with a code from each address", async () => {
    render(<AccountSettings person={person} backend={backend} />, {
      wrapper: MemoryRouter,
    });

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
    render(<AccountSettings person={person} backend={backend} upcoming={2} />, {
      wrapper: MemoryRouter,
    });

    expect(
      screen.getByText(
        "You have 2 upcoming bookings. Cancel or complete them first.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Close business" }),
    ).toBeDisabled();
  });

  it("asks for dispute fees owed to be paid before closing", async () => {
    const onPayOwed = vi.fn();

    render(
      <AccountSettings
        person={person}
        backend={backend}
        owed={13.59}
        onPayOwed={onPayOwed}
      />,
      {
        wrapper: MemoryRouter,
      },
    );

    expect(
      screen.getByRole("button", { name: "Close business" }),
    ).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Pay £13.59" }));

    expect(onPayOwed).toHaveBeenCalledOnce();
  });

  it("confirms closing the business in a dialog on <body>", async () => {
    render(<AccountSettings person={person} backend={backend} />, {
      wrapper: MemoryRouter,
    });

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
    render(
      <AccountSettings person={person} backend={backend} page="security" />,
      {
        wrapper: MemoryRouter,
      },
    );

    expect(screen.getByLabelText("Loading sessions")).toBeInTheDocument();
    expect(await screen.findByText("Signed in 12 Oct")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Sign out of iPad · Safari" }),
    );

    expect(backend.signOutSession).toHaveBeenCalledWith("s2");

    expect(
      await screen.findByText("Signed out of iPad · Safari"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("No other devices are signed in."),
    ).toBeInTheDocument();
  });

  it("security: login alerts show the saved setting once it's loaded", async () => {
    vi.mocked(backend.getSecurity).mockResolvedValueOnce({
      login_alerts: false,
      sessions: [],
    });

    render(
      <AccountSettings person={person} backend={backend} page="security" />,
      { wrapper: MemoryRouter },
    );

    expect(screen.getByLabelText("Loading login alerts")).toBeInTheDocument();

    expect(
      await screen.findByRole("switch", { name: "Login alerts" }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("security: when Supabase asks, the password change needs the emailed code", async () => {
    render(
      <AccountSettings person={person} backend={backend} page="security" />,
      {
        wrapper: MemoryRouter,
      },
    );

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

  it("security: a rejected password says why, even without a code", async () => {
    render(
      <AccountSettings
        person={person}
        page="security"
        backend={{
          ...backend,
          changePassword: () => Promise.resolve("same_password"),
        }}
      />,
      { wrapper: MemoryRouter },
    );

    await user.type(screen.getByLabelText("New password"), "tide2lamp-violet");

    await user.type(
      screen.getByLabelText("Confirm new password"),
      "tide2lamp-violet",
    );

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That’s your current password. Choose a new one.",
    );
  });

  it("security: the passwords must match", async () => {
    render(
      <AccountSettings person={person} backend={backend} page="security" />,
      {
        wrapper: MemoryRouter,
      },
    );

    await user.type(screen.getByLabelText("New password"), "tide2lamp-violet");
    await user.type(screen.getByLabelText("Confirm new password"), "tide2lamp");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("Passwords don’t match."),
    ).toBeInTheDocument();
  });

  it("security: errors clear once the password is edited", async () => {
    render(
      <AccountSettings
        person={person}
        page="security"
        backend={{
          ...backend,
          changePassword: () => Promise.resolve("same_password"),
        }}
      />,
      { wrapper: MemoryRouter },
    );

    const next = screen.getByLabelText("New password");
    const confirm = screen.getByLabelText("Confirm new password");

    await user.type(next, "tide2lamp-violetx");
    await user.type(confirm, "tide2lamp-violet");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("Passwords don’t match."),
    ).toBeInTheDocument();

    await user.type(next, "{Backspace}");

    await waitFor(() =>
      expect(
        screen.queryByText("Passwords don’t match."),
      ).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText(
        "That’s your current password. Choose a new one.",
      ),
    ).toBeInTheDocument();

    await user.type(next, "s");

    expect(
      screen.queryByText("That’s your current password. Choose a new one."),
    ).not.toBeInTheDocument();
  });

  it("security: a social sign-in offers to set a password", () => {
    render(
      <AccountSettings
        person={person}
        backend={backend}
        page="security"
        signIn="apple"
      />,
      {
        wrapper: MemoryRouter,
      },
    );

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
    render(
      <AccountSettings
        person={person}
        backend={backend}
        page="payouts"
        payoutStatus={payoutStatus}
      />,
      {
        wrapper: MemoryRouter,
      },
    );

    expect(screen.getByText(title)).toBeInTheDocument();
  });

  it("payouts without tax details are on hold", async () => {
    const onTaxAdd = vi.fn();

    render(
      <AccountSettings
        person={person}
        backend={backend}
        page="payouts"
        onTaxAdd={onTaxAdd}
      />,
      {
        wrapper: MemoryRouter,
      },
    );

    await user.click(screen.getByRole("button", { name: "Add tax details" }));
    expect(onTaxAdd).toHaveBeenCalled();
  });

  it("notifications toggle per channel", async () => {
    render(
      <AccountSettings
        person={person}
        backend={backend}
        page="notifications"
      />,
      {
        wrapper: MemoryRouter,
      },
    );

    const sms = screen.getByRole("switch", { name: "New booking by SMS" });

    await user.click(sms);
    expect(sms).toHaveAttribute("aria-checked", "true");
  });

  it("notifications start from the saved choices and save each toggle", async () => {
    const saveNotification = vi.fn(() => Promise.resolve());

    render(
      <AccountSettings
        person={person}
        page="notifications"
        notifications={{ newBooking: { email: false, sms: true } }}
        backend={{ ...backend, saveNotification }}
      />,
      { wrapper: MemoryRouter },
    );

    const email = screen.getByRole("switch", { name: "New booking by email" });

    expect(email).toHaveAttribute("aria-checked", "false");
    await user.click(email);

    expect(saveNotification).toHaveBeenCalledWith("newBooking", {
      email: true,
      sms: true,
    });
  });

  it("a notification toggle that doesn't save goes back", async () => {
    render(
      <AccountSettings
        person={person}
        page="notifications"
        backend={{
          ...backend,
          saveNotification: () => Promise.reject(new Error("offline")),
        }}
      />,
      { wrapper: MemoryRouter },
    );

    const sms = screen.getByRole("switch", { name: "New booking by SMS" });

    await user.click(sms);

    await vi.waitFor(() =>
      expect(sms).toHaveAttribute("aria-checked", "false"),
    );
  });

  it("a failed save doesn't undo a later toggle of the same row", async () => {
    const saveNotification = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined);

    render(
      <AccountSettings
        person={person}
        page="notifications"
        backend={{ ...backend, saveNotification }}
      />,
      { wrapper: MemoryRouter },
    );

    await user.click(
      screen.getByRole("switch", { name: "New booking by SMS" }),
    );

    await user.click(
      screen.getByRole("switch", { name: "New booking by email" }),
    );

    await vi.waitFor(() => expect(saveNotification).toHaveBeenCalledTimes(2));

    expect(
      screen.getByRole("switch", { name: "New booking by email" }),
    ).toHaveAttribute("aria-checked", "false");

    expect(
      screen.getByRole("switch", { name: "New booking by SMS" }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("calendar: Google is coming soon, and the subscribe link loads and resets", async () => {
    render(
      <AccountSettings person={person} backend={backend} page="calendar" />,
      {
        wrapper: MemoryRouter,
      },
    );

    expect(screen.getByText("Coming soon")).toBeInTheDocument();

    const link = await screen.findByDisplayValue(
      "webcal://tiwarashouse.com/cal/studio/first.ics",
    );

    expect(link).toHaveAccessibleName("Your calendar link");

    expect(
      screen.getByRole("link", { name: "Apple Calendar" }),
    ).toHaveAttribute("href", "webcal://tiwarashouse.com/cal/studio/first.ics");

    await user.click(screen.getByRole("button", { name: "Reset link" }));

    await user.click(
      within(
        screen.getByRole("alertdialog", { name: "Reset your subscribe link?" }),
      ).getByRole("button", { name: "Reset link" }),
    );

    expect(
      await screen.findByText("New link ready. Add it to your calendar app"),
    ).toBeInTheDocument();

    expect(link).toHaveValue("webcal://tiwarashouse.com/cal/studio/second.ics");
  });

  it("calendar: says when the link couldn't load and can try again", async () => {
    vi.mocked(backend.getCalendarFeed)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(`${FEED}/first.ics`);

    render(
      <AccountSettings person={person} backend={backend} page="calendar" />,
      {
        wrapper: MemoryRouter,
      },
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your calendar link couldn’t load.",
    );

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(
      await screen.findByDisplayValue(
        "webcal://tiwarashouse.com/cal/studio/first.ics",
      ),
    ).toBeInTheDocument();
  });
});
