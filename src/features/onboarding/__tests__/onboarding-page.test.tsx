import { act, screen } from "@testing-library/react";
import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../test/render-with-store";
import { OnboardingPage } from "../onboarding-page";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";
import { turnstileStub } from "../../../test/setup";
import * as auth from "../../../lib/auth";

vi.mock("../../../lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/auth")>()),
  getAccountKind: vi.fn(),
  getSignedInAccount: vi.fn(),
  resendEmailCode: vi.fn(),
  signIn: vi.fn(),
  verifyEmailCode: vi.fn(),
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
    renderWithStore(<OnboardingPage />, "/join?fixture=w4-bizcontact", {
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
      expect(screen.getByTestId("location")).toHaveTextContent("/search"),
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

    renderWithStore(
      <OnboardingPage />,
      "/login?screen=cust-password&board=true",
    );

    await user.type(screen.getByLabelText("Password"), "a long password");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    await act(async () => undefined);
    expect(auth.signIn).not.toHaveBeenCalled();

    act(() => turnstileStub.release?.());

    await vi.waitFor(() => expect(auth.signIn).toHaveBeenCalled());
  });

  it("the login code step takes a code from any app and offers support", () => {
    renderWithStore(<OnboardingPage />, "/login?fixture=pro-2fa");

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
    renderWithStore(<OnboardingPage />, "/login?screen=pro-email&board=true");

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

    renderWithStore(
      <OnboardingPage />,
      "/login?screen=cust-password&board=true",
    );

    await user.type(screen.getByLabelText("Password"), "not my password");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(
      await screen.findByText(
        "That password isn’t right. Try again or reset it.",
      ),
    ).toBeInTheDocument();
  });

  it("a wrong password shows the error", () => {
    renderWithStore(
      <OnboardingPage />,
      "/login?fixture=wrong-password&password=strict&board=true",
    );

    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(
      "That password isn’t right. Try again or reset it.",
    );
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
    renderWithStore(<OnboardingPage />, "/join?screen=w4&board=true");

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

  it("the code screen loads the human check only when Resend is tapped", async () => {
    vi.mocked(auth.resendEmailCode).mockResolvedValue();
    renderWithStore(<OnboardingPage />, "/signup?screen=verify&board=true");

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
    renderWithStore(<OnboardingPage />, "/signup?screen=verify&board=true");

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
    renderWithStore(<OnboardingPage />, "/join?screen=w1&board=true");
    await user.click(screen.getByRole("radio", { name: /Mobile/ }));
    advance(300);

    expect(
      screen.getByRole("heading", { name: "What services do you offer?" }),
    ).toBeInTheDocument();
  });

  it("a code the server accepts signs the new customer in", async () => {
    vi.mocked(auth.verifyEmailCode).mockResolvedValue(true);

    renderWithStore(
      <OnboardingPage />,
      "/signup?screen=verify&board=true&stayOnDone=true",
    );

    for (const [index, digit] of [..."482913"].entries())
      await user.type(screen.getByLabelText(`Digit ${index + 1}`), digit);

    await vi.waitFor(() =>
      expect(screen.getByRole("status")).toBeInTheDocument(),
    );

    expect(auth.verifyEmailCode).toHaveBeenCalledWith(
      "ama@example.com",
      "482913",
    );

    // a board's verify screen is a customer sign-up: it ends with the welcome toast
    expect(screen.getByRole("status")).toHaveTextContent(
      "Welcome to Tiwára’s House, Ama",
    );
  });

  it("Client Terms opens the terms sheet", async () => {
    renderWithStore(
      <OnboardingPage />,
      "/signup?screen=cust-create&board=true",
    );

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
      renderWithStore(<OnboardingPage />, "/login?screen=w1&board=true");

      expect(
        screen.getByRole("heading", { name: "How do you work?" }),
      ).toBeInTheDocument();

      expect(getLocation()).toBe("/join");
    });
  });
});
