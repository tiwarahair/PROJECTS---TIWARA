import { describe, expect, it } from "vitest";
import { bookingDetailsSchema } from "./booking-details";

const VALID = {
  firstName: "Amara",
  lastName: "Johnson",
  email: "amara@example.com",
  phone: "+44 7700 000000",
  notes: "",
};

/**
 * The first message per field — Zod reports every failed check, but React Hook
 * Form only surfaces the first, so that is what a client actually sees.
 */
const errorsFor = (input: Record<string, unknown>) => {
  const result = bookingDetailsSchema.safeParse(input);
  const messages: Record<string, string> = {};
  if (result.success) return messages;

  for (const { path, message } of result.error.issues) {
    const field = path.join(".");
    messages[field] ??= message;
  }
  return messages;
};

describe("bookingDetailsSchema", () => {
  it("accepts a complete set of details", () => {
    const result = bookingDetailsSchema.safeParse(VALID);
    expect(result.success).toBe(true);
  });

  it("requires every field except notes", () => {
    const errors = errorsFor({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      notes: "",
    });

    expect(errors.firstName).toBe("First name is required");
    expect(errors.lastName).toBe("Last name is required");
    expect(errors.email).toBe("Email address is required");
    expect(errors.phone).toBe("Phone number is required");
    expect(errors.notes).toBeUndefined();
  });

  it("rejects a malformed email", () => {
    expect(errorsFor({ ...VALID, email: "amara-at-example" }).email).toBe(
      "Enter a valid email address",
    );
  });

  it("rejects a phone number with letters or too few digits", () => {
    expect(errorsFor({ ...VALID, phone: "call me" }).phone).toBe(
      "Enter a valid phone number",
    );
    expect(errorsFor({ ...VALID, phone: "12345" }).phone).toBe(
      "Enter a valid phone number",
    );
  });

  it("trims whitespace off the parsed values", () => {
    const result = bookingDetailsSchema.safeParse({
      ...VALID,
      firstName: "  Amara  ",
      email: "  amara@example.com  ",
    });

    expect(result.success).toBe(true);
    expect(result.data?.firstName).toBe("Amara");
    expect(result.data?.email).toBe("amara@example.com");
  });
});
