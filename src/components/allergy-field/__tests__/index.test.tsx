import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AllergyField } from "..";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

describe("AllergyField", () => {
  it("default: label, hint for the stylist and no counter", () => {
    render(<AllergyField stylistName="Amara Beauty" />);
    expect(screen.getByLabelText("Allergies or sensitivities")).toHaveValue("");

    expect(
      screen.getByText(/Only Amara Beauty will see this\./),
    ).toBeInTheDocument();

    expect(screen.queryByText(/\/ 1000/)).not.toBeInTheDocument();
  });

  it("falls back to 'your stylist' without a name", () => {
    render(<AllergyField />);

    expect(
      screen.getByText(/Only your stylist will see this\./),
    ).toBeInTheDocument();
  });

  it("has no counter below 800 characters", () => {
    render(<AllergyField value={"x".repeat(799)} />);
    expect(screen.queryByText(/\/ 1000/)).not.toBeInTheDocument();
  });

  it("matches the server's 1,000-character limit, counting from 800", () => {
    render(<AllergyField value={"x".repeat(800)} />);
    expect(screen.getByText("800 / 1000")).toBeInTheDocument();
  });

  it("caps input at 1,000 characters", async () => {
    const handleChange = vi.fn();

    render(<AllergyField onChange={handleChange} />);

    // the field is controlled by its parent, so a paste (one change) is what can exceed the cap here
    await user.click(screen.getByLabelText("Allergies or sensitivities"));
    await user.paste("y".repeat(1040));

    expect(handleChange).toHaveBeenCalledWith("y".repeat(1000));
  });

  it("opens and closes the privacy sheet", async () => {
    render(<AllergyField stylistName="Studio Zuri" />);
    await user.click(screen.getByRole("button", { name: "How we use it" }));

    const dialog = screen.getByRole("dialog", {
      name: "How we use your allergy information",
    });

    expect(dialog).toHaveTextContent("Studio Zuri, on your bookings.");
    await user.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clicking inside the sheet keeps it open; the scrim closes it", async () => {
    render(<AllergyField />);
    await user.click(screen.getByRole("button", { name: "How we use it" }));
    const dialog = screen.getByRole("dialog");

    await user.click(dialog);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(dialog.parentElement as HTMLElement);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("autoFocus focuses the textarea", () => {
    render(<AllergyField autoFocus />);
    expect(screen.getByLabelText("Allergies or sensitivities")).toHaveFocus();
  });
});
