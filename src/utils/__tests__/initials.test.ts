import { describe, expect, it } from "vitest";
import { getInitials } from "../initials";

describe("getInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(getInitials("Ada Lovelace")).toBe("AL");
    expect(getInitials("  ada   l.  ")).toBe("AL");
    expect(getInitials("Mary Ann Smith")).toBe("MA");
    expect(getInitials("nia.okafor@gmail.com")).toBe("N");
  });

  it("falls back to ? with no name", () => {
    expect(getInitials("")).toBe("?");
    expect(getInitials(null)).toBe("?");
  });
});
