import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../test/render-with-store";
import { SaveDetailsPage } from "./save-details-page";

describe("SaveDetailsPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });
  afterEach(() => vi.useRealTimers());

  it("shows the guest's email and asks for a 15+ character password", () => {
    renderWithStore(<SaveDetailsPage />, "/save-details");
    expect(
      screen.getByRole("heading", { name: "Finish saving your details" }),
    ).toBeInTheDocument();
    expect(screen.getByText("nia.okafor@gmail.com")).toBeInTheDocument();
    expect(screen.getByText("15+ characters")).toBeInTheDocument();
  });

  it("a short password shows the error on Save instead of saving", () => {
    renderWithStore(<SaveDetailsPage />, "/save-details");
    fireEvent.change(screen.getByLabelText("Create a password"), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save my details" }));
    expect(screen.getByRole("alert")).toHaveTextContent("15");
    expect(screen.getByLabelText("Create a password")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("a long password saves after 700ms and shows Your details are saved", () => {
    renderWithStore(<SaveDetailsPage />, "/save-details");
    fireEvent.change(screen.getByLabelText("Create a password"), {
      target: { value: "correct horse battery staple" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save my details" }));
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    act(() => vi.advanceTimersByTime(700));
    expect(
      screen.getByRole("heading", { name: "Your details are saved" }),
    ).toBeInTheDocument();
  });

  it("Show / Hide toggles the password field", () => {
    renderWithStore(<SaveDetailsPage />, "/save-details");
    const input = screen.getByLabelText("Create a password");
    expect(input).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
  });

  it("an expired link can send a new one, once", () => {
    renderWithStore(<SaveDetailsPage />, "/save-details?invite=expired");
    fireEvent.click(screen.getByRole("button", { name: "Send a new link" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "We've sent a new link to nia.okafor@gmail.com.",
    );
    expect(
      screen.getByRole("button", { name: "Send a new link" }),
    ).toBeDisabled();
  });
});
