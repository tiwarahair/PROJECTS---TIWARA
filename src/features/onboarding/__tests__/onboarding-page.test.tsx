import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../test/render-with-store";
import { OnboardingPage } from "../onboarding-page";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

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
  });

  afterEach(() => vi.useRealTimers());

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

  it("a known customer email goes to the password; the demo password logs in and returns", async () => {
    renderWithStore(
      <OnboardingPage />,
      "/login?screen=cust-email&return=%2Fsearch",
    );

    await user.type(
      screen.getByLabelText("Email address"),
      "nia.okafor@gmail.com",
    );

    await user.click(screen.getByRole("button", { name: "Continue" }));
    advance(650);

    expect(
      screen.getByRole("heading", { name: "Welcome back" }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Password"), "sunflower9");

    await user.click(screen.getByRole("button", { name: "Log in" }));
    advance(650);
    expect(screen.getByTestId("location")).toHaveTextContent("/search");
    expect(sessionStorage.getItem("tw_toast")).toBe("Welcome back, Nia");
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

  it("the wizard picks a business type and moves on after 300ms", async () => {
    renderWithStore(<OnboardingPage />, "/join?screen=w1&board=true");
    await user.click(screen.getByRole("radio", { name: /Mobile/ }));
    advance(300);

    expect(
      screen.getByRole("heading", { name: "What services do you offer?" }),
    ).toBeInTheDocument();
  });

  it("the code screen accepts 123456 typed into the boxes and signs the customer in", async () => {
    renderWithStore(
      <OnboardingPage />,
      "/signup?screen=verify&board=true&stayOnDone=true&code=strict",
    );

    for (const [index, digit] of [..."123456"].entries())
      await user.type(screen.getByLabelText(`Digit ${index + 1}`), digit);

    advance(650);

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

      await user.click(screen.getByRole("button", { name: "Continue" }));
      advance(650);

      expect(
        screen.getByRole("heading", { name: "Create account" }),
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
