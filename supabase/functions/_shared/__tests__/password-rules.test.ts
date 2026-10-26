import { describe, expect, it } from "vitest";
import { getPasswordProblem } from "../password-rules";

const person = { first: "Amara", last: "Okafor", email: "amara.o@example.com" };

describe("getPasswordProblem", () => {
  it("passes a long, personal-free password", () => {
    expect(getPasswordProblem("copper meadow 47 lantern", 15, person)).toBe("");
  });

  it("holds clients to 15 characters and stylists to 8", () => {
    expect(getPasswordProblem("copper-meadow", 15, person)).toBe("short");
    expect(getPasswordProblem("copper-meadow", 8, person)).toBe("");
  });

  it("caps every password at 64 characters", () => {
    expect(getPasswordProblem("a".repeat(65), 8, person)).toBe("long");
  });

  it("turns down common passwords, names, email and the site name, whatever the case, spaces or digits", () => {
    expect(getPasswordProblem("Pass word1", 8, person)).toBe("common");
    expect(getPasswordProblem("AmaraOkafor2024!", 8, person)).toBe("name");
    expect(getPasswordProblem("amara.o@example.com", 8, person)).toBe("name");
    expect(getPasswordProblem("Tiwára's House 1", 8, person)).toBe("site");
  });
});
