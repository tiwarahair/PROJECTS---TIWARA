import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserEvent } from "@testing-library/user-event";
import * as auth from "../../../lib/auth";
import { renderWithStore } from "../../../test/render-with-store";
import { setupUser } from "../../../test/setup-user";
import { BookingPage } from "../booking-page";

vi.mock("../../../lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/auth")>()),
  getAccountKind: vi.fn(),
  signIn: vi.fn(),
}));

let user: UserEvent;

const getDialog = () => within(screen.getByRole("dialog"));

const openLogin = async () => {
  renderWithStore(<BookingPage />, "/book?fixture=time-picked");
  await user.click(screen.getAllByRole("button", { name: /^Continue$/ })[0]!);
  await user.click(getDialog().getByRole("button", { name: "Log in" }));
};

const submitEmail = async (email: string) => {
  await user.type(getDialog().getByLabelText("Email"), email);
  await user.click(getDialog().getByRole("button", { name: "Continue" }));
};

describe("Booking log in dialog", () => {
  beforeEach(() => {
    user = setupUser();
    localStorage.clear();
    sessionStorage.clear();
    vi.mocked(auth.getAccountKind).mockReset();
    vi.mocked(auth.signIn).mockReset();
  });

  it("opens over the booking instead of leaving it", async () => {
    await openLogin();

    expect(screen.getByRole("dialog", { name: "Log in" })).toBeInTheDocument();
    expect(screen.queryByText("Leave this booking?")).not.toBeInTheDocument();
    expect(getDialog().getByLabelText("Email")).toHaveFocus();
  });

  it("checks the email before asking for a password", async () => {
    await openLogin();
    await user.click(getDialog().getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByText("Enter an email address"),
    ).toBeInTheDocument();

    expect(auth.getAccountKind).not.toHaveBeenCalled();
  });

  it("offers guest booking with the email when there's no account", async () => {
    vi.mocked(auth.getAccountKind).mockResolvedValue("none");
    await openLogin();
    await submitEmail("new.client@gmail.com");

    expect(
      await screen.findByRole("dialog", { name: "No account found" }),
    ).toBeInTheDocument();

    await user.click(
      getDialog().getByRole("button", { name: "Continue as guest" }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("new.client@gmail.com");
  });

  it("shows a wrong password on the password step", async () => {
    vi.mocked(auth.getAccountKind).mockResolvedValue("customer");
    vi.mocked(auth.signIn).mockResolvedValue("invalid_credentials");
    await openLogin();
    await submitEmail("nia.okafor@gmail.com");

    expect(
      await screen.findByRole("dialog", { name: "Welcome back" }),
    ).toBeInTheDocument();

    await user.type(getDialog().getByLabelText("Password"), "wrong-password");
    await user.click(getDialog().getByRole("button", { name: "Log in" }));

    expect(
      await screen.findByText("That password isn’t right"),
    ).toBeInTheDocument();

    expect(auth.signIn).toHaveBeenCalledWith(
      "nia.okafor@gmail.com",
      "wrong-password",
      "test-captcha-token",
    );
  });

  it("stays busy after a correct password until the account loads", async () => {
    vi.mocked(auth.getAccountKind).mockResolvedValue("customer");
    vi.mocked(auth.signIn).mockResolvedValue(null);
    await openLogin();
    await submitEmail("nia.okafor@gmail.com");
    await screen.findByRole("dialog", { name: "Welcome back" });
    await user.type(getDialog().getByLabelText("Password"), "a long password");
    await user.click(getDialog().getByRole("button", { name: "Log in" }));

    await vi.waitFor(() =>
      expect(
        getDialog().getByRole("button", { name: "Log in" }),
      ).toBeDisabled(),
    );
  });

  it("keeps the email when going back with Change", async () => {
    vi.mocked(auth.getAccountKind).mockResolvedValue("customer");
    await openLogin();
    await submitEmail("nia.okafor@gmail.com");
    await screen.findByRole("dialog", { name: "Welcome back" });
    await user.click(getDialog().getByRole("button", { name: "Change" }));

    expect(getDialog().getByLabelText("Email")).toHaveValue(
      "nia.okafor@gmail.com",
    );
  });

  it("closes on Escape", async () => {
    await openLogin();
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
