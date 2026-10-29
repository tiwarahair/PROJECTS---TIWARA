import { act, screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  changePassword,
  sendReauthenticationCode,
} from "../../../lib/account-changes";
import { renderWithStore } from "../../../test/render-with-store";
import { setupUser } from "../../../test/setup-user";
import { AccountPage } from "..";

vi.mock("../../../lib/account-changes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/account-changes")>()),
  changePassword: vi.fn(),
  sendReauthenticationCode: vi.fn(),
}));

const NEW_PASSWORD = "copper meadow river 47";

let user: UserEvent;

const settle = () =>
  act(async () => {
    for (let tick = 0; tick < 5; tick++) await Promise.resolve();
  });

const openPasswordForm = async () => {
  renderWithStore(<AccountPage />, "/account?section=security", {
    signedIn: true,
  });

  await user.click(screen.getByRole("button", { name: "Change password" }));
  await user.type(screen.getByLabelText("New password"), NEW_PASSWORD);
};

describe("Account password", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });

    user = setupUser();
    vi.mocked(changePassword).mockReset();
    vi.mocked(sendReauthenticationCode).mockReset();
  });

  afterEach(() => vi.useRealTimers());

  it("offers only Google as a connected account", () => {
    renderWithStore(<AccountPage />, "/account?section=security", {
      signedIn: true,
    });

    expect(
      screen.getByText("Log in with Google instead of a password."),
    ).toBeInTheDocument();

    expect(screen.queryByText("Apple")).not.toBeInTheDocument();
  });

  it("asks only for the new password, saves it and can log out other devices", async () => {
    vi.mocked(changePassword).mockResolvedValue(null);
    await openPasswordForm();

    expect(screen.queryByLabelText(/Current password/)).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("checkbox", { name: "Log me out on other devices" }),
    );

    await user.click(screen.getByRole("button", { name: "Save" }));
    await settle();

    expect(changePassword).toHaveBeenCalledWith(NEW_PASSWORD, "", true);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Your password is updated. Other devices are logged out",
    );

    expect(screen.getByText("Changed just now")).toBeInTheDocument();
  });

  it("emails a code when Supabase asks for one, then sends it with the password", async () => {
    vi.mocked(changePassword)
      .mockResolvedValueOnce("reauthentication_needed")
      .mockResolvedValueOnce(null);

    vi.mocked(sendReauthenticationCode).mockResolvedValue();
    await openPasswordForm();
    await user.click(screen.getByRole("button", { name: "Save" }));
    await settle();

    expect(sendReauthenticationCode).toHaveBeenCalled();

    expect(screen.getByRole("status")).toHaveTextContent(
      "We emailed a code to nia.okafor@gmail.com",
    );

    await user.click(screen.getByRole("button", { name: "Save" }));
    await settle();

    expect(
      screen.getByText("Enter the code we emailed you"),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Code from your email"), "48a2913");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await settle();

    expect(changePassword).toHaveBeenLastCalledWith(
      NEW_PASSWORD,
      "482913",
      false,
    );

    expect(
      screen.queryByLabelText("Code from your email"),
    ).not.toBeInTheDocument();
  });

  it("shows Supabase's reason when the password isn't changed", async () => {
    vi.mocked(changePassword).mockResolvedValue("same_password");
    await openPasswordForm();
    await user.click(screen.getByRole("button", { name: "Save" }));
    await settle();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "That’s your current password. Choose a new one.",
    );
  });
});
