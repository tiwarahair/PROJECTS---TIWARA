import { describe, expect, it } from "vitest";
import { stylistApplicationSchema } from "./stylist-application";

const VALID = {
  name: "Amara Johnson",
  business: "Amara Beauty Studio",
  location: "London",
  experience: "3-5 years",
  email: "amara@example.com",
  phone: "",
  instagram: "",
  services: ["Braids & Protective Styles"],
  bio: "",
  portfolio: "",
};

/** First message per field, matching what React Hook Form surfaces. */
const errorsFor = (input: Record<string, unknown>) => {
  const result = stylistApplicationSchema.safeParse(input);
  const messages: Record<string, string> = {};
  if (result.success) return messages;

  for (const { path, message } of result.error.issues) {
    const field = path.join(".");
    messages[field] ??= message;
  }
  return messages;
};

describe("stylistApplicationSchema", () => {
  it("accepts an application with only the required fields filled in", () => {
    expect(stylistApplicationSchema.safeParse(VALID).success).toBe(true);
  });

  it("requires name, business, location and email", () => {
    const errors = errorsFor({
      ...VALID,
      name: "",
      business: "",
      location: "",
      email: "",
    });

    expect(errors.name).toBe("Your name is required");
    expect(errors.business).toBe("Business name is required");
    expect(errors.location).toBe("City or location is required");
    expect(errors.email).toBe("Email address is required");
  });

  // The UI has always marked this required; only the schema enforces it.
  it("requires at least one service", () => {
    expect(errorsFor({ ...VALID, services: [] }).services).toBe(
      "Select at least one service",
    );
  });

  it("treats phone and portfolio as optional but validates what is typed", () => {
    expect(stylistApplicationSchema.safeParse(VALID).success).toBe(true);

    expect(errorsFor({ ...VALID, phone: "ring me" }).phone).toBeDefined();
    expect(errorsFor({ ...VALID, portfolio: "instagram" }).portfolio).toBe(
      "Enter a valid link, including https://",
    );
    expect(
      stylistApplicationSchema.safeParse({
        ...VALID,
        phone: "+44 7700 000000",
        portfolio: "https://instagram.com/amara",
      }).success,
    ).toBe(true);
  });
});
