import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../test/render-with-store";
import { OnboardingPage } from "./onboarding-page";

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

  it("starts on the chooser; For customers asks for an email", () => {
    renderWithStore(<OnboardingPage />, "/onboarding");
    expect(
      screen.getByRole("heading", { name: "Log in or sign up" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /For customers/ }));
    expect(
      screen.getByRole("heading", { name: "Tiwára’s House for customers" }),
    ).toBeInTheDocument();
  });

  it("a known customer email goes to the password; the demo password logs in and returns", () => {
    renderWithStore(
      <OnboardingPage />,
      "/onboarding?screen=cust-email&return=%2Fsearch",
    );
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "nia.okafor@gmail.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    advance(650);
    expect(
      screen.getByRole("heading", { name: "Welcome back" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "sunflower9" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    advance(650);
    expect(screen.getByTestId("location")).toHaveTextContent("/search");
    expect(sessionStorage.getItem("tw_toast")).toBe("Welcome back, Nia");
  });

  it("a wrong password shows the error", () => {
    renderWithStore(
      <OnboardingPage />,
      "/onboarding?fixture=wrong-password&password=strict&board=true",
    );
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(
      "That password isn’t right. Try again or reset it.",
    );
  });

  it("the wizard picks a business type and moves on after 300ms", () => {
    renderWithStore(<OnboardingPage />, "/onboarding?screen=w1&board=true");
    fireEvent.click(screen.getByRole("radio", { name: /Mobile/ }));
    advance(300);
    expect(
      screen.getByRole("heading", { name: "What services do you offer?" }),
    ).toBeInTheDocument();
  });

  it("the code screen accepts 123456 typed into the boxes and signs the customer in", () => {
    renderWithStore(
      <OnboardingPage />,
      "/onboarding?screen=verify&board=true&stayOnDone=true&code=strict",
    );
    "123456".split("").forEach((digit, index) =>
      fireEvent.change(screen.getByLabelText("Digit " + (index + 1)), {
        target: { value: digit },
      }),
    );
    advance(650);
    // a board's verify screen is a customer sign-up: it ends with the welcome toast
    expect(screen.getByRole("status")).toHaveTextContent(
      "Welcome to Tiwára’s House, Ama",
    );
  });

  it("Client Terms opens the terms sheet", () => {
    renderWithStore(
      <OnboardingPage />,
      "/onboarding?screen=cust-create&board=true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Client Terms" }));
    expect(
      screen.getByRole("dialog", { name: "Client Terms" }),
    ).toBeInTheDocument();
  });
});
