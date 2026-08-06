import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepDetails } from "./step-details";
import type { BookingDetails } from "../../types/booking";

const EMPTY: BookingDetails = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  notes: "",
};

const noop = () => {};

const renderStep = (props: Partial<Parameters<typeof StepDetails>[0]> = {}) =>
  render(
    <StepDetails
      details={EMPTY}
      onChange={noop}
      onBack={noop}
      onNext={noop}
      {...props}
    />,
  );

const submit = () =>
  userEvent.click(screen.getByRole("button", { name: "Review booking →" }));

describe("StepDetails", () => {
  it("renders without crashing", () => {
    renderStep();
    expect(screen.getByText("Your details")).toBeInTheDocument();
  });

  it("blocks the review step until the required fields are filled in", async () => {
    const onNext = vi.fn();
    renderStep({ onNext });

    await submit();

    expect(onNext).not.toHaveBeenCalled();
    expect(await screen.findByText("First name is required")).toBeVisible();
    expect(screen.getByText("Last name is required")).toBeVisible();
    expect(screen.getByText("Email address is required")).toBeVisible();
    expect(screen.getByText("Phone number is required")).toBeVisible();
  });

  it("rejects a malformed email address", async () => {
    const onNext = vi.fn();
    renderStep({ onNext });

    await userEvent.type(
      screen.getByLabelText("Email address"),
      "not-an-email",
    );
    await submit();

    expect(
      await screen.findByText("Enter a valid email address"),
    ).toBeVisible();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("hands the trimmed details up and advances once they are valid", async () => {
    const onChange = vi.fn();
    const onNext = vi.fn();
    renderStep({ onChange, onNext });

    await userEvent.type(screen.getByLabelText("First name"), "  Amara  ");
    await userEvent.type(screen.getByLabelText("Last name"), "Johnson");
    await userEvent.type(
      screen.getByLabelText("Email address"),
      "amara@example.com",
    );
    await userEvent.type(
      screen.getByLabelText("Phone number"),
      "+44 7700 000000",
    );
    await submit();

    expect(onChange).toHaveBeenCalledWith({
      firstName: "Amara",
      lastName: "Johnson",
      email: "amara@example.com",
      phone: "+44 7700 000000",
      notes: "",
    });
    expect(onNext).toHaveBeenCalled();
  });

  it("still lets the client go back without filling anything in", async () => {
    const onBack = vi.fn();
    renderStep({ onBack });

    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalled();
  });
});
