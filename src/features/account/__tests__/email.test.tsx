import { act, screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  sendEmailChangeCodes,
  verifyEmailChangeCode,
} from "../../../lib/account-changes";
import { renderWithStore } from "../../../test/render-with-store";
import { setupUser } from "../../../test/setup-user";
import { AccountPage } from "..";

vi.mock("../../../lib/account-changes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/account-changes")>()),
  sendEmailChangeCodes: vi.fn(),
  verifyEmailChangeCode: vi.fn(),
}));

let user: UserEvent;

const settle = () =>
  act(async () => {
    for (let tick = 0; tick < 5; tick++) await Promise.resolve();
  });

const startChange = async (email: string) => {
  renderWithStore(<AccountPage />, "/account?section=personal", {
    signedIn: true,
  });

  await user.click(screen.getByRole("button", { name: "Edit email" }));
  await user.type(screen.getByLabelText("New email"), email);
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await settle();
};

const typeCode = async (row: "Current" | "New", code: string) => {
  for (const [index, digit] of [...code].entries())
    await user.type(
      screen.getByLabelText(`${row} email digit ${index + 1}`),
      digit,
    );

  await settle();
};

describe("Account email change", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });

    user = setupUser();
    vi.mocked(sendEmailChangeCodes).mockReset().mockResolvedValue(null);
    vi.mocked(verifyEmailChangeCode).mockReset();
  });

  afterEach(() => vi.useRealTimers());

  it("sends a code to each address and changes the email once both are right", async () => {
    vi.mocked(verifyEmailChangeCode).mockResolvedValue(true);
    await startChange("nia@example.com");

    expect(sendEmailChangeCodes).toHaveBeenCalledWith("nia@example.com");
    expect(screen.getByText("Code sent to nia.okafor@gmail.com")).toBeVisible();
    expect(screen.getByText("Code sent to nia@example.com")).toBeVisible();

    await typeCode("Current", "111111");

    expect(verifyEmailChangeCode).toHaveBeenCalledWith(
      "nia.okafor@gmail.com",
      "111111",
    );

    expect(screen.getByRole("img", { name: "Confirmed" })).toBeInTheDocument();

    await typeCode("New", "222222");

    expect(verifyEmailChangeCode).toHaveBeenLastCalledWith(
      "nia@example.com",
      "222222",
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Your email is updated",
    );

    expect(screen.getByText("nia@example.com")).toBeInTheDocument();
  });

  it("checks each code once, one at a time, however often Confirm is pressed", async () => {
    let finishCheck: (isRight: boolean) => void = () => undefined;

    vi.mocked(verifyEmailChangeCode).mockImplementation(
      () => new Promise((resolve) => (finishCheck = resolve)),
    );

    await startChange("nia@example.com");
    await typeCode("Current", "111111");
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(verifyEmailChangeCode).toHaveBeenCalledTimes(1);

    await act(async () => finishCheck(true));
    await settle();

    expect(verifyEmailChangeCode).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("img", { name: "Confirmed" })).toBeInTheDocument();
  });

  it("a wrong code says so and leaves the email unchanged", async () => {
    vi.mocked(verifyEmailChangeCode).mockResolvedValue(false);
    await startChange("nia@example.com");
    await typeCode("New", "999999");

    expect(
      screen.getByText("That code isn’t right or has expired."),
    ).toBeInTheDocument();

    expect(screen.getByText("Code sent to nia@example.com")).toBeVisible();
  });

  it("an email another account uses is refused before any code is sent", async () => {
    vi.mocked(sendEmailChangeCodes).mockResolvedValue("email_exists");
    await startChange("kemi@example.com");

    expect(
      screen.getByText("That email is already used by another account."),
    ).toBeInTheDocument();

    expect(screen.getByLabelText("New email")).toBeInTheDocument();
  });
});
