import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AllergyField } from "./allergy-field";

describe("AllergyField", () => {
  it("default: label, hint for the stylist and no counter", () => {
    render(<AllergyField stylistName="Amara Beauty" />);
    expect(screen.getByLabelText("Allergies or sensitivities")).toHaveValue("");

    expect(
      screen.getByText(/Only Amara Beauty will see this\./),
    ).toBeInTheDocument();

    expect(screen.queryByText(/\/ 200/)).not.toBeInTheDocument();
  });

  it("falls back to 'your stylist' without a name", () => {
    render(<AllergyField />);

    expect(
      screen.getByText(/Only your stylist will see this\./),
    ).toBeInTheDocument();
  });

  it("shows the counter from 150 characters", () => {
    render(<AllergyField value={"x".repeat(150)} />);
    expect(screen.getByText("150 / 200")).toBeInTheDocument();
  });

  it("caps input at 200 characters", () => {
    const handleChange = vi.fn();

    render(<AllergyField onChange={handleChange} />);

    fireEvent.change(screen.getByLabelText("Allergies or sensitivities"), {
      target: { value: "y".repeat(240) },
    });

    expect(handleChange).toHaveBeenCalledWith("y".repeat(200));
  });

  it("opens and closes the privacy sheet", () => {
    render(<AllergyField stylistName="Studio Zuri" />);
    fireEvent.click(screen.getByRole("button", { name: "How we use it" }));

    const dialog = screen.getByRole("dialog", {
      name: "How we use your allergy information",
    });

    expect(dialog).toHaveTextContent("Studio Zuri, on your bookings.");
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("openPrivacy shows the sheet on load; the scrim closes it", () => {
    render(<AllergyField openPrivacy />);
    const dialog = screen.getByRole("dialog");

    fireEvent.click(dialog);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(dialog.parentElement as HTMLElement);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("autoFocus focuses the textarea", () => {
    render(<AllergyField autoFocus />);
    expect(screen.getByLabelText("Allergies or sensitivities")).toHaveFocus();
  });
});
