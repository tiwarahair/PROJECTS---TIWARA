import { describe, expect, it } from "vitest";
import { getClientNames } from "../model";

describe("getClientNames", () => {
  it("keeps a first name with a space whole", () => {
    expect(
      getClientNames({ id: "c1", name: "Mary Jane Smith", first: "Mary Jane" }),
    ).toEqual({ first: "Mary Jane", last: "Smith" });
  });

  it("splits on the first space when the first name isn't known", () => {
    expect(getClientNames({ id: "c1", name: "Nia Okafor" })).toEqual({
      first: "Nia",
      last: "Okafor",
    });
  });
});
