import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../test/render-with-store";
import { AccountPage } from "../account-page";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

// board=true: the demo account (Nia), as a signed-in customer
const renderAccount = (query = "") =>
  renderWithStore(<AccountPage />, `/account?board=true${query}`, {
    signedIn: true,
  });

const getLabelled = (label: string) =>
  document.querySelector(`[data-screen-label="${label}"]`);

describe("AccountPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });

    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => vi.useRealTimers());

  it("renders without crashing: wide screens open on the overview", () => {
    renderAccount();

    expect(
      screen.getByRole("heading", { level: 1, name: "Hi Nia" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("navigation", { name: "Your account" }),
    ).toBeInTheDocument();

    expect(getLabelled("Account: Overview")).toBeInTheDocument();
  });

  it("a real account with no bookings shows Nothing shared yet and how the information is used", async () => {
    renderWithStore(<AccountPage />, "/account?section=shared", {
      signedIn: true,
    });

    expect(
      screen.getByRole("heading", { name: "Nothing shared yet" }),
    ).toBeInTheDocument();

    const empty = getLabelled("Shared with stylists empty") as HTMLElement;

    expect(
      within(empty).getByRole("link", { name: "Find a stylist" }),
    ).toHaveAttribute("href", "/search");

    await user.click(
      screen.getByRole("button", { name: "How we use this information" }),
    );

    expect(
      screen.getByRole("dialog", {
        name: "How we use your allergy information",
      }),
    ).toBeInTheDocument();
  });

  it("logged out shows the log-in gate with the return link", () => {
    renderWithStore(<AccountPage />, "/account?section=bookings");

    expect(
      screen.getByRole("heading", { name: "Log in to see your account" }),
    ).toBeInTheDocument();

    const gate = screen.getByRole("main");
    const returnParam = encodeURIComponent("/account?section=bookings");

    expect(within(gate).getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      `/login?screen=cust-email&return=${returnParam}`,
    );
  });

  it("maps the legacy ?tab= values to sections", () => {
    renderAccount("&tab=details");

    expect(
      screen.getByRole("heading", { level: 1, name: "Shared with stylists" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["ov-empty", "Overview: no upcoming"],
    ["bk-empty", "Bookings: no upcoming"],
    ["bk-none", "Bookings: no upcoming"],
    ["receipt", "Receipt"],
    ["quiz-none", "Hair profile: not taken"],
    ["email-edit", "Email: editing"],
    ["email-code", "Email code step"],
    ["email-pending", "Email change pending"],
    ["pw-open", "Change password open"],
    ["cards-empty", "Payment methods empty"],
    ["add-card", "Add a card"],
    ["addr-add", "Add an address"],
    ["addr-edit", "Edit address"],
    ["cookies", "Cookie settings"],
    ["delete-blocked", "Delete account blocked"],
    ["delete-allowed", "Delete account allowed"],
    ["deleted", "Account deleted"],
  ])("fixture %s shows %s", (fixture, label) => {
    renderAccount(`&fixture=${fixture}`);
    expect(getLabelled(label)).toBeInTheDocument();
  });

  it.each([
    ["photo-error", "That photo is too big. Choose one under 10MB."],
    ["email-invalid", "Enter an email address like name@example.com"],
    ["email-same", "That’s already your email"],
    ["email-taken", "This email is already used by another account"],
    ["email-wrong", "That code isn’t right"],
    ["email-expired", "That code has expired. Send a new one."],
  ])("fixture %s shows the error", (fixture, message) => {
    renderAccount(`&fixture=${fixture}`);
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it.each([
    ["bk-past", "View receipt"],
    ["alg-edit", "Save"],
    ["profile-full", "Change photo"],
    ["personal-edit", "Save"],
    ["nopw", "Set a password"],
    ["logout-all", "Log out everywhere"],
    ["card-remove", "Remove card"],
    ["addr-remove", "Remove"],
    ["mkt-on", "Copy calendar link"],
    ["sync-reset", "Reset link"],
  ])("fixture %s renders its controls", (fixture, name) => {
    renderAccount(`&fixture=${fixture}`);
    expect(screen.getAllByRole("button", { name })[0]).toBeInTheDocument();
  });

  it("fixture addr-empty shows the empty line", () => {
    renderAccount("&fixture=addr-empty");
    expect(getLabelled("Saved addresses empty")).toBeInTheDocument();
  });

  it("fixture email-done shows the toast", () => {
    renderAccount("&fixture=email-done");

    expect(screen.getByRole("status")).toHaveTextContent(
      "Email updated. We’ve let nia.okafor@gmail.com know.",
    );
  });

  it("the side nav switches section and updates the URL", async () => {
    renderAccount();
    await user.click(screen.getByRole("link", { name: "Payment methods" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Payment methods" }),
    ).toBeInTheDocument();

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/account?board=true&section=payments",
    );
  });

  it("changing the email sends a code; 123456 confirms it", async () => {
    renderAccount("&section=personal");
    await user.click(screen.getByRole("button", { name: "Edit email" }));

    await user.type(screen.getByLabelText("New email"), "nia@example.com");

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(getLabelled("Email code step")).toBeInTheDocument();

    for (const [index, digit] of [..."123456"].entries())
      await user.type(screen.getByLabelText(`Digit ${index + 1}`), digit);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Email updated. We’ve let nia.okafor@gmail.com know.",
    );

    expect(screen.getByText("nia@example.com")).toBeInTheDocument();
    advance(3200);
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("the add-card dialog validates, then saves the card", async () => {
    renderAccount("&fixture=add-card");
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: "Save card" }));
    expect(within(dialog).getByText("Enter your card number")).toBeVisible();

    await user.type(
      within(dialog).getByPlaceholderText("1234 1234 1234 1234"),
      "5555555555554444",
    );

    await user.type(within(dialog).getByPlaceholderText("MM / YY"), "1240");

    await user.type(within(dialog).getByPlaceholderText("CVC"), "123");

    await user.click(within(dialog).getByRole("button", { name: "Save card" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getAllByText("Mastercard •••• 4444")).toHaveLength(2);
  });

  it("log out everywhere ends the session and shows the gate", async () => {
    renderAccount("&fixture=logout-all");
    const dialog = screen.getByRole("dialog");

    await user.click(
      within(dialog).getByRole("button", { name: "Log out everywhere" }),
    );

    expect(sessionStorage.getItem("tw_cust")).toBeNull();

    expect(
      screen.getByRole("heading", { name: "Log in to see your account" }),
    ).toBeInTheDocument();
  });

  it("delete stays disabled until DELETE is typed", async () => {
    renderAccount("&fixture=delete-allowed");

    const remove = within(screen.getByRole("dialog")).getByRole("button", {
      name: "Delete account",
    });

    expect(remove).toBeDisabled();

    await user.type(screen.getByLabelText("Type DELETE to confirm"), "delete");

    expect(remove).toBeEnabled();
    await user.click(remove);

    expect(
      screen.getByRole("heading", { name: "Your account has been deleted" }),
    ).toBeInTheDocument();
  });

  it("Escape closes the dialog", async () => {
    renderAccount("&fixture=sync-reset");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
