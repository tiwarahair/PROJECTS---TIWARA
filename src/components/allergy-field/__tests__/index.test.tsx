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

  it("caps input at 200 characters", async () => {
    const handleChange = vi.fn();

    render(<AllergyField onChange={handleChange} />);

    // the field is controlled by its parent, so a paste (one change) is what can exceed the cap here
    await user.click(screen.getByLabelText("Allergies or sensitivities"));
    await user.paste("y".repeat(240));

    expect(handleChange).toHaveBeenCalledWith("y".repeat(200));
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

  it("openPrivacy shows the sheet on load; the scrim closes it", async () => {
    render(<AllergyField openPrivacy />);
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
