import { act, screen } from "@testing-library/react";
import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../test/render-with-store";
import { OnboardingPage } from "..";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";
import { turnstileStub } from "../../../test/setup";
import * as auth from "../../../lib/auth";
import * as twoFactor from "../../../lib/two-factor";
import { supabase } from "../../../lib/supabase";

vi.mock("../../../lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/auth")>()),
  checkNewPassword: vi.fn(async () => ""),
  getAccountKind: vi.fn(),
  getSignedInAccount: vi.fn(),
  resendEmailCode: vi.fn(),
  signIn: vi.fn(),
  signUpClient: vi.fn(),
  setNewPassword: vi.fn(async () => null),
  signUpStylist: vi.fn(),
  verifyEmailCode: vi.fn(),
}));

vi.mock("../../../lib/two-factor", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/two-factor")>()),
  needsSecondFactor: vi.fn(async () => false),
  verifySecondFactor: vi.fn(),
}));

vi.mock("../../../lib/supabase", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/supabase")>()),
  rememberDevice: vi.fn(),
}));

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

/** Progress saved on this device from an earlier visit (the form's email and name). */
const saveProgress = (form: Record<string, string>) =>
  localStorage.setItem("tw_onboarding_v1", JSON.stringify({ form }));

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });

    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    turnstileStub.isHeld = false;
  });

  it("a signed-in customer's account step shows their own details, locked, with no password", () => {
    renderWithStore(<OnboardingPage />, "/join?screen=w4", {
      signedIn: true,
    });

    expect(
      screen.getByRole("heading", { name: "Your details" }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText("Email address")).toHaveValue(
      "nia.okafor@gmail.com",
    );

    expect(screen.getByLabelText("Email address")).toHaveAttribute("readonly");
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });

  it("starts on the chooser; For customers asks for an email", async () => {
    renderWithStore(<OnboardingPage />, "/login");

    expect(
      screen.getByRole("heading", { name: "Log in or sign up" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /For customers/ }));

    expect(
      screen.getByRole("heading", { name: "Tiwára’s House for customers" }),
    ).toBeInTheDocument();
  });

  it("an existing customer's email goes to the password; logging in returns to the page they came from", async () => {
    vi.mocked(auth.getAccountKind).mockResolvedValue("customer");
    vi.mocked(auth.signIn).mockResolvedValue(null);

    renderWithStore(
      <OnboardingPage />,
      "/login?screen=cust-email&return=%2Fsearch",
    );

    await user.type(screen.getByLabelText("Email address"), "nia@example.com");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByRole("heading", { name: "Welcome back" }),
    ).toBeInTheDocument();

    expect(auth.getAccountKind).toHaveBeenCalledWith(
      "nia@example.com",
      "test-captcha-token",
    );

    await user.type(screen.getByLabelText("Password"), "a long password");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    await vi.waitFor(() =>
      expect(screen.getByTestId("location").textContent).toBe("/search"),
    );

    expect(sessionStorage.getItem("tw_toast")).toBe("Welcome back");
  });

  it("Back on the screen they arrived on returns to the page that sent them", async () => {
    renderWithStore(
      <OnboardingPage />,
      "/signup?screen=cust-create&return=%2Fbook%3Fstylist%3Dtiwaras-house%26resume%3D1",
    );

    await user.click(screen.getAllByRole("button", { name: "Back" })[0]!);

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/book?stylist=tiwaras-house&resume=1",
    );
  });

  it("Log in can be tapped before the bot check passes, then logs in once it does", async () => {
    vi.mocked(auth.signIn).mockResolvedValue(null);
    turnstileStub.isHeld = true;

    renderWithStore(<OnboardingPage />, "/login?screen=cust-password");

    await user.type(screen.getByLabelText("Password"), "a long password");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    await act(async () => undefined);
    expect(auth.signIn).not.toHaveBeenCalled();

    act(() => turnstileStub.release?.());

    await vi.waitFor(() => expect(auth.signIn).toHaveBeenCalled());
  });

  it("the login code step takes a code from any app and offers support", () => {
    renderWithStore(<OnboardingPage />, "/login?screen=pro-2fa");

    expect(
      screen.getByText("Enter a code from your authenticator app."),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Lost your phone? Contact support" }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "Use your backup authenticator" }),
    ).not.toBeInTheDocument();
  });

  it("an empty field only shows its error after Continue, not when focus leaves it", async () => {
    renderWithStore(<OnboardingPage />, "/login?screen=pro-email");

    await user.click(screen.getByLabelText("Email address"));
    await user.tab();

    expect(
      screen.queryByText("Enter your email address"),
    ).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Email address"), "nia@");
    await user.tab();

    expect(
      await screen.findByText("Enter a valid email address"),
    ).toBeInTheDocument();
  });

  describe("when the email lookup fails", () => {
    const failWith = (error: Error) =>
      vi.mocked(auth.getAccountKind).mockRejectedValue(error);

    const submitEmail = async () => {
      renderWithStore(<OnboardingPage />, "/login?screen=cust-email");

      await user.type(
        screen.getByLabelText("Email address"),
        "ama@example.com",
      );

      await user.click(screen.getByRole("button", { name: "Continue" }));
    };

    it("rate limited: says so, keeps the email and lets them try again", async () => {
      failWith(new FunctionsHttpError(new Response(null, { status: 429 })));
      await submitEmail();

      expect(
        await screen.findByText("Too many attempts. Please try again later."),
      ).toBeInTheDocument();

      expect(screen.getByLabelText("Email address")).toHaveValue(
        "ama@example.com",
      );

      expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();

      expect(
        screen.queryByRole("button", { name: "Try again" }),
      ).not.toBeInTheDocument();
    });

    it("bot check: asks them to try again", async () => {
      failWith(new FunctionsHttpError(new Response(null, { status: 403 })));
      await submitEmail();

      expect(
        await screen.findByText(
          "We couldn’t confirm you’re human. Please try again.",
        ),
      ).toBeInTheDocument();
    });

    it("network: offers Try again, which tries the lookup again", async () => {
      failWith(new FunctionsFetchError(new TypeError("Failed to fetch")));
      await submitEmail();

      await user.click(
        await screen.findByRole("button", { name: "Try again" }),
      );

      await vi.waitFor(() =>
        expect(auth.getAccountKind).toHaveBeenCalledTimes(2),
      );
    });

    it("the alert goes once the email changes", async () => {
      failWith(new FunctionsHttpError(new Response(null, { status: 429 })));
      await submitEmail();
      await screen.findByText("Too many attempts. Please try again later.");
      await user.type(screen.getByLabelText("Email address"), "x");

      expect(
        screen.queryByText("Too many attempts. Please try again later."),
      ).not.toBeInTheDocument();
    });
  });

  it("a wrong password from the server shows the error", async () => {
    vi.mocked(auth.signIn).mockResolvedValue("invalid_credentials");

    renderWithStore(<OnboardingPage />, "/login?screen=cust-password");

    await user.type(screen.getByLabelText("Password"), "not my password");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(
      await screen.findByText(
        "That password isn’t right. Try again or reset it.",
      ),
    ).toBeInTheDocument();
  });

  it("backing out of Google sign-in returns to the chooser without an error", async () => {
    vi.mocked(auth.getSignedInAccount).mockResolvedValue(null);
    renderWithStore(<OnboardingPage />, "/login?flow=social");

    await vi.waitFor(() => expect(auth.getSignedInAccount).toHaveBeenCalled());

    expect(
      screen.getByRole("heading", { name: "Log in or sign up" }),
    ).toBeInTheDocument();

    expect(screen.queryByText(/can’t connect/)).not.toBeInTheDocument();
  });

  it("the stylist account step moves on without a server check", async () => {
    saveProgress({
      email: "amara@tiwarashouse.com",
      first: "Amara",
      last: "Okonkwo",
    });

    renderWithStore(<OnboardingPage />, "/join?screen=w4");

    await user.type(screen.getByLabelText("Mobile"), "7700900456");
    await user.type(screen.getByLabelText("Password"), "copper meadow 47");
    await user.click(screen.getByRole("checkbox", { name: /Partner Terms/ }));
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByRole("heading", {
        name: "How did you hear about us?",
      }),
    ).toBeInTheDocument();

    expect(auth.getAccountKind).not.toHaveBeenCalled();
  });

  it("a stylist password the server turns down goes back to the account step with why", async () => {
    vi.mocked(auth.checkNewPassword).mockResolvedValueOnce("pwned");

    localStorage.setItem(
      "tw_onboarding_v1",
      JSON.stringify({
        form: {
          email: "amara@tiwarashouse.com",
          first: "Amara",
          last: "Okonkwo",
        },
        geocodedLatLng: [53.45, -2.22],
      }),
    );

    renderWithStore(<OnboardingPage />, "/join?screen=w4");

    await user.type(screen.getByLabelText("Mobile"), "7700900456");
    await user.type(screen.getByLabelText("Password"), "copper meadow 47");
    await user.click(screen.getByRole("checkbox", { name: /Partner Terms/ }));
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await screen.findByRole("heading", { name: "How did you hear about us?" });
    await user.click(screen.getByRole("button", { name: /Skip/ }));

    expect(
      await screen.findByText(
        "This password has appeared in a data breach. Choose a different one.",
      ),
    ).toBeInTheDocument();

    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(auth.signUpStylist).not.toHaveBeenCalled();
  });

  it("the code screen loads the human check only when Resend is tapped", async () => {
    vi.mocked(auth.resendEmailCode).mockResolvedValue();
    saveProgress({ email: "ama@example.com", first: "Ama", last: "Mensah" });
    renderWithStore(<OnboardingPage />, "/signup?screen=verify");

    advance(30_000);
    expect(auth.resendEmailCode).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Resend code" }));

    await vi.waitFor(() =>
      expect(auth.resendEmailCode).toHaveBeenCalledWith(
        "ama@example.com",
        "test-captcha-token",
      ),
    );
  });

  it("a failed bot check on Resend says so, and Resend can be tapped again", async () => {
    vi.mocked(auth.resendEmailCode).mockResolvedValue();
    turnstileStub.isHeld = true;
    saveProgress({ email: "ama@example.com", first: "Ama", last: "Mensah" });
    renderWithStore(<OnboardingPage />, "/signup?screen=verify");

    advance(30_000);
    await user.click(screen.getByRole("button", { name: "Resend code" }));
    act(() => turnstileStub.fail?.());

    expect(
      screen.getByText("We couldn’t confirm you’re human. Please try again."),
    ).toBeInTheDocument();

    turnstileStub.isHeld = false;
    await user.click(screen.getByRole("button", { name: "Resend code" }));

    await vi.waitFor(() => expect(auth.resendEmailCode).toHaveBeenCalled());
  });

  it("the wizard picks a business type and moves on after 300ms", async () => {
    renderWithStore(<OnboardingPage />, "/join?screen=w1");
    await user.click(screen.getByRole("radio", { name: /Mobile/ }));
    advance(300);

    expect(
      screen.getByRole("heading", { name: "What services do you offer?" }),
    ).toBeInTheDocument();
  });

  it("a code the server accepts signs the new customer in", async () => {
    vi.mocked(auth.signUpClient).mockResolvedValue(true);
    vi.mocked(auth.verifyEmailCode).mockResolvedValue(true);

    saveProgress({ email: "ama@example.com", first: "Ama", last: "Mensah" });

    renderWithStore(
      <OnboardingPage />,
      "/signup?screen=cust-create&return=%2Fsearch",
    );

    await user.type(screen.getByLabelText("Mobile"), "7700900123");
    await user.type(screen.getByLabelText("Password"), "copper meadow 47");
    await user.click(screen.getByRole("checkbox", { name: /Client Terms/ }));
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await screen.findByLabelText("Digit 1");

    for (const [index, digit] of [..."482913"].entries())
      await user.type(screen.getByLabelText(`Digit ${index + 1}`), digit);

    await vi.waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/search"),
    );

    expect(auth.verifyEmailCode).toHaveBeenCalledWith(
      "ama@example.com",
      "482913",
    );

    expect(sessionStorage.getItem("tw_toast")).toBe(
      "Welcome to Tiwára’s House, Ama",
    );
  });

  it("a password the server turns down says why, and nobody is signed up", async () => {
    vi.mocked(auth.checkNewPassword).mockResolvedValueOnce("pwned");

    saveProgress({ email: "ama@example.com", first: "Ama", last: "Mensah" });

    renderWithStore(<OnboardingPage />, "/signup?screen=cust-create");

    await user.type(screen.getByLabelText("Mobile"), "7700900123");
    await user.type(screen.getByLabelText("Password"), "copper meadow 47");
    await user.click(screen.getByRole("checkbox", { name: /Client Terms/ }));
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByText(
        "This password has appeared in a data breach. Choose a different one.",
      ),
    ).toBeInTheDocument();

    expect(auth.checkNewPassword).toHaveBeenCalledWith(
      "copper meadow 47",
      "client",
      { first: "Ama", last: "Mensah", email: "ama@example.com" },
    );

    expect(auth.signUpClient).not.toHaveBeenCalled();
  });

  it("a reset on a two-factor account asks for the authenticator code before saving", async () => {
    vi.mocked(twoFactor.needsSecondFactor).mockResolvedValueOnce(true);
    vi.mocked(twoFactor.verifySecondFactor).mockResolvedValueOnce(true);

    renderWithStore(<OnboardingPage />, "/login?flow=reset");

    await user.type(
      screen.getByLabelText("New password"),
      "copper meadow 47 lantern",
    );

    await user.type(
      screen.getByLabelText("Confirm new password"),
      "copper meadow 47 lantern",
    );

    await user.click(screen.getByRole("button", { name: "Update password" }));
    await screen.findByLabelText("Digit 1");

    expect(auth.setNewPassword).not.toHaveBeenCalled();

    for (const [index, digit] of [..."482913"].entries())
      await user.type(screen.getByLabelText(`Digit ${index + 1}`), digit);

    expect(
      await screen.findByRole("heading", { name: "Password updated" }),
    ).toBeInTheDocument();

    expect(twoFactor.verifySecondFactor).toHaveBeenCalledWith("482913");

    expect(auth.setNewPassword).toHaveBeenCalledWith(
      "copper meadow 47 lantern",
    );
  });

  describe("two-step sign-in on a trusted device", () => {
    const TOKEN_KEY = "tw_trusted_device:user-1";

    const signInAs = async (isAdmin = false) => {
      vi.mocked(twoFactor.needsSecondFactor).mockResolvedValue(true);
      vi.mocked(auth.signIn).mockResolvedValue(null);

      vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
        data: {
          session: {
            user: { id: "user-1", app_metadata: { is_admin: isAdmin } },
          },
        },
        error: null,
      } as never);

      const rpc = vi.spyOn(supabase, "rpc").mockImplementation(((
        name: string,
        args?: { token?: string },
      ) =>
        Promise.resolve({
          data:
            name === "trust_device" ? "new-token" : args?.token === "trusted",
          error: null,
        })) as never);

      renderWithStore(<OnboardingPage />, "/login?screen=pro-password");

      await user.type(screen.getByLabelText("Password"), "a long password");
      await user.click(screen.getByRole("button", { name: "Log in" }));

      return rpc;
    };

    it("a trusted device goes straight to Studio", async () => {
      localStorage.setItem(TOKEN_KEY, "trusted");

      const rpc = await signInAs();

      await vi.waitFor(async () => {
        await advance(500);
        expect(screen.getByTestId("location").textContent).toBe("/studio");
      });

      expect(rpc).toHaveBeenCalledWith("check_trusted_device", {
        token: "trusted",
      });

      expect(screen.queryByLabelText("Digit 1")).not.toBeInTheDocument();
    });

    it("an expired or unknown token asks for the code and is forgotten", async () => {
      localStorage.setItem(TOKEN_KEY, "expired");

      await signInAs();

      expect(await screen.findByLabelText("Digit 1")).toBeInTheDocument();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it("an admin always enters the code and can't trust the device", async () => {
      localStorage.setItem(TOKEN_KEY, "trusted");

      const rpc = await signInAs(true);

      expect(await screen.findByLabelText("Digit 1")).toBeInTheDocument();
      expect(rpc).not.toHaveBeenCalled();

      expect(
        screen.queryByLabelText("Trust this device for 30 days"),
      ).not.toBeInTheDocument();
    });

    it("ticking Trust this device keeps a token after the code", async () => {
      vi.mocked(twoFactor.verifySecondFactor).mockResolvedValueOnce(true);

      const rpc = await signInAs();

      const trustBox = await screen.findByLabelText(
        "Trust this device for 30 days",
      );

      expect(trustBox).not.toBeChecked();

      await user.click(trustBox);

      for (const [index, digit] of [..."482913"].entries())
        await user.type(screen.getByLabelText(`Digit ${index + 1}`), digit);

      await vi.waitFor(() => expect(rpc).toHaveBeenCalledWith("trust_device"));
      expect(localStorage.getItem(TOKEN_KEY)).toBe("new-token");
    });
  });

  it("Client Terms opens the terms sheet", async () => {
    renderWithStore(<OnboardingPage />, "/signup?screen=cust-create");

    await user.click(screen.getByRole("button", { name: "Client Terms" }));

    expect(
      screen.getByRole("dialog", { name: "Client Terms" }),
    ).toBeInTheDocument();
  });

  describe("routes", () => {
    const getLocation = () => screen.getByTestId("location").textContent;

    it("/join opens on the stylist landing and Get started begins the set-up", async () => {
      renderWithStore(<OnboardingPage />, "/join");

      expect(
        screen.getByRole("heading", { name: /Run your hair/ }),
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Get started" }));

      expect(
        screen.getByRole("heading", { name: "How do you work?" }),
      ).toBeInTheDocument();

      expect(getLocation()).toBe("/join");
    });

    it("/signup opens on the email step", () => {
      renderWithStore(<OnboardingPage />, "/signup");
      expect(screen.getByLabelText("Email address")).toBeInTheDocument();
      expect(getLocation()).toBe("/signup");
    });

    it("a new email on /login moves to /signup, keeping the email", async () => {
      renderWithStore(<OnboardingPage />, "/login?screen=cust-email");

      await user.type(
        screen.getByLabelText("Email address"),
        "new.person@example.com",
      );

      vi.mocked(auth.getAccountKind).mockResolvedValue("none");
      await user.click(screen.getByRole("button", { name: "Continue" }));

      expect(
        await screen.findByRole("heading", { name: "Create account" }),
      ).toBeInTheDocument();

      expect(screen.getByText(/new.person@example.com/)).toBeInTheDocument();
      expect(getLocation()).toBe("/signup");
    });

    it("Log in on the stylist landing moves to /login", async () => {
      renderWithStore(<OnboardingPage />, "/join");
      await user.click(screen.getByRole("button", { name: "Log in" }));
      expect(getLocation()).toBe("/login");
    });

    it("a ?screen= for another route opens on that route", () => {
      renderWithStore(<OnboardingPage />, "/login?screen=w1");

      expect(
        screen.getByRole("heading", { name: "How do you work?" }),
      ).toBeInTheDocument();

      expect(getLocation()).toBe("/join");
    });
  });
});
