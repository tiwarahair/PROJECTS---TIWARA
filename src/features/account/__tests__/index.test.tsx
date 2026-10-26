import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "../../../lib/supabase";
import { renderWithStore } from "../../../test/render-with-store";
import { AccountPage } from "..";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

vi.mock("../../../lib/client-sensitivities", () => ({
  fetchMySensitivities: vi.fn(() => Promise.resolve([])),
}));

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

const renderAccount = (query = "") =>
  renderWithStore(<AccountPage />, `/account${query}`, { signedIn: true });

const getLabelled = (label: string) =>
  document.querySelector(`[data-screen-label="${label}"]`);

const settle = () =>
  act(async () => {
    for (let tick = 0; tick < 5; tick++) await Promise.resolve();
  });

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

    // the list arrives on the next animation frame, a faked timer here
    await act(() => vi.advanceTimersByTimeAsync(100));

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
    renderAccount("?tab=details");

    expect(
      screen.getByRole("heading", { level: 1, name: "Shared with stylists" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["overview", "Overview: no upcoming"],
    ["bookings", "Bookings: no upcoming"],
    ["hair", "Hair profile: not taken"],
    ["payments", "Payment methods empty"],
    ["addresses", "Saved addresses empty"],
  ])("a new account's %s section shows %s", (section, label) => {
    renderAccount(`?section=${section}`);
    expect(getLabelled(label)).toBeInTheDocument();
  });

  it("the email edit checks the address before sending a code", async () => {
    renderAccount("?section=personal");
    await user.click(screen.getByRole("button", { name: "Edit email" }));
    await user.type(screen.getByLabelText("New email"), "nia@example");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await settle();

    expect(
      screen.getByText("Enter an email address like name@example.com"),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText("New email"));
    await user.type(screen.getByLabelText("New email"), "nia.okafor@gmail.com");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await settle();
    expect(screen.getByText("That’s already your email")).toBeInTheDocument();
  });

  it("the side nav switches section and updates the URL", async () => {
    renderAccount();
    await user.click(screen.getByRole("link", { name: "Payment methods" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Payment methods" }),
    ).toBeInTheDocument();

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/account?section=payments",
    );
  });

  it("leaving a section with an unsaved edit asks first; Keep editing stays, Discard leaves", async () => {
    renderAccount("?section=personal");
    await user.click(screen.getByRole("button", { name: "Edit email" }));
    await user.type(screen.getByLabelText("New email"), "nia@example.com");
    await user.click(screen.getByRole("link", { name: "Payment methods" }));

    expect(
      screen.getByRole("heading", { name: "Discard changes?" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.getByLabelText("New email")).toHaveValue("nia@example.com");

    await user.click(screen.getByRole("link", { name: "Payment methods" }));
    await user.click(screen.getByRole("button", { name: "Discard" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Payment methods" }),
    ).toBeInTheDocument();
  });

  it("log out everywhere ends every session and shows the gate", async () => {
    const signOut = vi
      .spyOn(supabase.auth, "signOut")
      .mockResolvedValue({ error: null });

    renderAccount("?section=security");

    await user.click(
      screen.getByRole("button", { name: "Log out everywhere" }),
    );

    const dialog = screen.getByRole("dialog");

    await user.click(
      within(dialog).getByRole("button", { name: "Log out everywhere" }),
    );

    expect(signOut).toHaveBeenCalledWith({ scope: "global" });
    expect(sessionStorage.getItem("tw_cust")).toBeNull();

    expect(
      screen.getByRole("heading", { name: "Log in to see your account" }),
    ).toBeInTheDocument();
  });

  it("Escape closes the dialog", async () => {
    renderAccount("?section=privacy");
    await user.click(screen.getByRole("button", { name: "Cookie settings" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
